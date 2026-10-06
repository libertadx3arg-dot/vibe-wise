using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Diagnostics;
using System.Media;
using System.Windows;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Threading;
using VibeWise.HardwareMonitor.Controls;
using VibeWise.HardwareMonitor.Models;
using VibeWise.HardwareMonitor.Services;

namespace VibeWise.HardwareMonitor;

public partial class MainWindow : Window
{
    const string GpuKey = "GPU";
    const string VramKey = "VRAM";

    readonly SensorReader _reader = new();
    readonly AlarmEngine _alarms = new();
    readonly TrayService _tray = new();
    readonly CompactWindow _compact = new();

    readonly DispatcherTimer _timer = new() { Interval = TimeSpan.FromSeconds(1) };
    readonly DispatcherTimer _blinkTimer = new() { Interval = TimeSpan.FromMilliseconds(500) };
    readonly DispatcherTimer _soundTimer = new() { Interval = TimeSpan.FromSeconds(3) };

    readonly Metric _gpu = new() { Title = "GPU" };
    readonly Metric _vram = new() { Title = "VRAM" };
    readonly ObservableCollection<FanItem> _fans = new();
    readonly Dictionary<string, FanItem> _fanById = new();

    AppConfig _cfg = AppConfig.Load();
    DateTime _cfgStamp = AppConfig.Stamp();

    Snapshot? _last;
    bool? _vramTempMode;
    bool _busy, _ready, _exiting, _trayHintShown, _blink, _muted, _haveData, _startupEnabled;
    AlertLevel _overall = AlertLevel.Ok;
    string _activeText = "";
    string _lastEvent = "";
    string _notice = "";
    DateTime _noticeUntil;

    public MainWindow()
    {
        InitializeComponent();

        MetricsList.ItemsSource = new[] { _gpu, _vram };
        FanList.ItemsSource = _fans;

        _timer.Tick += async (_, _) => await RefreshAsync();
        _blinkTimer.Tick += (_, _) => BlinkTick();
        _soundTimer.Tick += (_, _) => SoundTick();

        _tray.OpenRequested += ShowFull;
        _tray.CompactRequested += ShowCompact;
        _tray.ExitRequested += ExitApp;

        _compact.ExpandRequested += ShowFull;
        _compact.PositionChanged += (l, t) =>
        {
            _cfg.CompactLeft = l;
            _cfg.CompactTop = t;
            SaveCfg();
        };

        AlarmLog.EnsureExists();
    }

    /// <summary>Arranque: abre los sensores y muestra la ventana (o solo la bandeja si viene de Windows).</summary>
    public async void Begin(bool startMinimized)
    {
        if (_cfg.CompactMode) ShowCompact();
        else if (!startMinimized) Show();

        _blinkTimer.Start();
        _soundTimer.Start();
        _ = RefreshStartupStateAsync();

        try
        {
            await Task.Run(_reader.Open);
            _ready = true;
        }
        catch (Exception ex)
        {
            StatusText.Text = "No se pudieron abrir los sensores de la GPU: " + ex.Message;
            return;
        }
        await RefreshAsync();
        _timer.Start();
    }

    public void MarkExiting() => _exiting = true;

    // ---------------------------------------------------------------- lectura

    async Task RefreshAsync()
    {
        if (_busy || !_ready) return;
        _busy = true;
        try
        {
            _last = await Task.Run(_reader.Read);
            Apply(_last);
        }
        catch (Exception ex)
        {
            StatusText.Text = "Error leyendo sensores: " + ex.Message;
        }
        finally
        {
            _busy = false;
        }
    }

    void Apply(Snapshot s)
    {
        ReloadConfigIfChanged();
        double hyst = _cfg.HysteresisC;
        double gpuT = s.GpuTemp ?? double.NaN;
        _haveData = s.GpuTemp.HasValue || s.VramTemp.HasValue || s.VramPercent.HasValue;

        var active = new List<string>();

        // ---- GPU
        Handle(_alarms.EvaluateTemp(GpuKey, "GPU", gpuT, _cfg.GpuWarn, _cfg.GpuCritical, hyst));
        var gpuLevel = _alarms.GetLevel(GpuKey);
        _gpu.Unit = "°C";
        _gpu.Warn = _cfg.GpuWarn;
        _gpu.Crit = _cfg.GpuCritical;
        _gpu.Maximum = Math.Max(110, _cfg.GpuCritical + 15);
        _gpu.Detail = s.GpuName ?? "GPU no detectada";
        _gpu.Detail2 = Join(
            s.GpuLoad is { } load ? $"Carga {load:0}%" : null,
            s.GpuHotSpot is { } hs ? $"Hot spot {hs:0} °C" : null);
        _gpu.SetLevel(gpuLevel);
        _gpu.Push(gpuT);
        if (gpuLevel != AlertLevel.Ok) active.Add($"GPU {gpuT:0} °C");

        // ---- VRAM: temperatura si la GPU la expone; si no, ocupación (sin alarmas)
        bool tempMode = s.VramTemp.HasValue;
        if (_vramTempMode != tempMode)
        {
            _vramTempMode = tempMode;
            _vram.ResetStats();
            _alarms.Reset(VramKey);
        }

        string usage = s.VramUsedMb is { } used && s.VramTotalMb is { } total
            ? $"{used / 1024:0.0} / {total / 1024:0.0} GB"
            : s.VramPercent is { } p ? $"Uso {p:0}%" : "";

        var vramLevel = AlertLevel.Ok;
        string vramText = "--";
        string vramCaption = "VRAM";
        double vramValue;
        if (tempMode)
        {
            vramValue = s.VramTemp!.Value;
            Handle(_alarms.EvaluateTemp(VramKey, "VRAM", vramValue, _cfg.VramWarn, _cfg.VramCritical, hyst));
            vramLevel = _alarms.GetLevel(VramKey);
            _vram.Title = "VRAM · Temperatura";
            _vram.Unit = "°C";
            _vram.Warn = _cfg.VramWarn;
            _vram.Crit = _cfg.VramCritical;
            _vram.Maximum = Math.Max(120, _cfg.VramCritical + 15);
            _vram.Detail = usage;
            _vram.Detail2 = s.VramPercent is { } vp ? $"Ocupación {vp:0}%" : "";
            vramText = $"{vramValue:0}°";
            if (vramLevel != AlertLevel.Ok) active.Add($"VRAM {vramValue:0} °C");
        }
        else
        {
            vramValue = s.VramPercent ?? double.NaN;
            _vram.Title = "VRAM · Ocupación";
            _vram.Unit = "%";
            _vram.Warn = double.NaN;
            _vram.Crit = double.NaN;
            _vram.Maximum = 100;
            _vram.Detail = usage;
            _vram.Detail2 = "Esta GPU no expone la temperatura de la VRAM";
            vramCaption = "VRAM %";
            vramText = double.IsNaN(vramValue) ? "--" : $"{vramValue:0}%";
        }
        _vram.SetLevel(vramLevel);
        _vram.Push(vramValue);

        // ---- Ventiladores
        var overall = AlarmEngine.Worst(gpuLevel, vramLevel);
        var fanLevel = AlertLevel.Ok;
        int index = 0;
        foreach (var r in s.Fans)
        {
            index++;
            if (!_fanById.TryGetValue(r.Id, out var fan))
            {
                fan = new FanItem(r.Id, $"Ventilador {index}");
                _fanById[r.Id] = fan;
                _fans.Add(fan);
            }

            string key = "FAN:" + r.Id;
            Handle(_alarms.EvaluateFan(key, fan.Name, r.Rpm, gpuT, _cfg.FanStoppedGpuTempC, hyst));
            bool stopped = _alarms.GetLevel(key) == AlertLevel.Crit;
            fan.Update(r.Rpm, _cfg.FanMaxRpm, stopped);
            if (stopped)
            {
                fanLevel = AlertLevel.Crit;
                active.Add($"{fan.Name} detenido");
            }
        }
        overall = AlarmEngine.Worst(overall, fanLevel);
        UpdateFanNotes();

        _overall = overall;
        if (_overall != AlertLevel.Crit) _muted = false;
        _activeText = active.Count > 0
            ? string.Join("  ·  ", active)
            : _lastEvent.Length > 0 ? "Sin alarmas activas · último evento " + _lastEvent : "Sin alarmas activas";

        var interval = TimeSpan.FromSeconds(_cfg.SoundRepeatSeconds);
        if (_soundTimer.Interval != interval) _soundTimer.Interval = interval;

        RenderStatus();
        PushCompact(gpuT, gpuLevel, vramCaption, vramText, vramLevel, fanLevel);

        StatusText.Text = DateTime.Now < _noticeUntil
            ? _notice
            : $"Actualizado {DateTime.Now:HH:mm:ss} · cada 1 s · umbrales en config.json (⚙) · eventos en alarmas.log (🗒)";
    }

    void UpdateFanNotes()
    {
        int reported = _fans.Count;
        NoFans.Visibility = reported == 0 ? Visibility.Visible : Visibility.Collapsed;

        int missing = _cfg.GpuFanCount - reported;
        if (reported > 0 && missing > 0)
        {
            FanNote.Text = missing == 1
                ? $"Nota: el ventilador {_cfg.GpuFanCount} (3.º) no reporta RPM; la GPU solo informa {reported}."
                : $"Nota: {missing} ventiladores no reportan RPM; la GPU solo informa {reported} de {_cfg.GpuFanCount}.";
            FanNote.Visibility = Visibility.Visible;
        }
        else
        {
            FanNote.Visibility = Visibility.Collapsed;
        }
    }

    // ---------------------------------------------------------------- alarmas

    void Handle(AlarmEvent? ev)
    {
        if (ev is null) return;

        AlarmLog.Write(ev);
        _lastEvent = $"{ev.Time:HH:mm:ss} · {ev.Message}";

        if (ev.Level != AlertLevel.Crit) return;
        if (_cfg.NotificationsEnabled) _tray.Notify("ALARMA · " + ev.Sensor, ev.Message, critical: true);
        if (_cfg.SoundEnabled && !_muted) SystemSounds.Hand.Play();
    }

    void SoundTick()
    {
        if (_overall == AlertLevel.Crit && !_muted && _cfg.SoundEnabled) SystemSounds.Hand.Play();
    }

    void BlinkTick()
    {
        _blink = !_blink;
        _gpu.SetBlink(_blink);
        _vram.SetBlink(_blink);
        RenderStatus();
        if (_lastCompact is not null) _compact.Render(_lastCompact with { Blink = _blink });
    }

    void StatusBar_Click(object sender, MouseButtonEventArgs e)
    {
        if (_overall != AlertLevel.Crit) return;
        _muted = !_muted;
        RenderStatus();
    }

    void RenderStatus()
    {
        var level = _haveData ? _overall : AlertLevel.Ok;
        Brush brush = _haveData ? Palette.BrushForLevel(level) : Palette.IdleBrush;
        var color = _haveData ? Palette.ForLevel(level) : Palette.Idle;
        bool flash = level == AlertLevel.Crit && _blink;

        StatusDot.Fill = brush;
        StatusDot.Opacity = level == AlertLevel.Crit && !_blink ? 0.35 : 1;
        StatusLabel.Foreground = brush;
        StatusLabel.Text = !_haveData ? "Sin datos"
            : level switch { AlertLevel.Crit => "ALARMA", AlertLevel.Warn => "Aviso", _ => "Todo OK" };
        StatusDetail.Text = _haveData ? _activeText : "No se detecta ninguna GPU con sensores.";
        StatusHint.Text = level == AlertLevel.Crit
            ? (_muted ? "Sonido silenciado · clic para reactivar" : "Clic para silenciar")
            : "";

        byte alpha = flash ? (byte)0x80 : (byte)0x26;
        StatusBar.Background = new SolidColorBrush(Color.FromArgb(alpha, color.R, color.G, color.B));
    }

    // ---------------------------------------------------------------- modo compacto / bandeja

    CompactState? _lastCompact;

    void PushCompact(double gpuT, AlertLevel gpuLevel, string vramCaption, string vramText,
        AlertLevel vramLevel, AlertLevel fanLevel)
    {
        string fans = _fans.Count == 0
            ? "--"
            : string.Join(" · ", _fans.Select(f => f.Rpm.ToString("0"))) + " RPM";

        _lastCompact = new CompactState(
            double.IsNaN(gpuT) ? "--" : $"{gpuT:0}°", gpuLevel,
            vramCaption, vramText, vramLevel,
            fans, fanLevel,
            _overall, _blink);
        _compact.Render(_lastCompact);
    }

    void ShowCompact()
    {
        _compact.Place(_cfg.CompactLeft, _cfg.CompactTop);
        _compact.Show();
        Hide();
        if (!_cfg.CompactMode)
        {
            _cfg.CompactMode = true;
            SaveCfg();
        }
    }

    void ShowFull()
    {
        _compact.Hide();
        Show();
        if (WindowState == WindowState.Minimized) WindowState = WindowState.Normal;
        Activate();
        if (_cfg.CompactMode)
        {
            _cfg.CompactMode = false;
            SaveCfg();
        }
    }

    void ExitApp()
    {
        _exiting = true;
        _timer.Stop();
        _blinkTimer.Stop();
        _soundTimer.Stop();
        _tray.Dispose();
        _compact.Close();
        Application.Current.Shutdown();
    }

    // La X no cierra: manda la ventana a la bandeja del sistema.
    protected override void OnClosing(CancelEventArgs e)
    {
        if (!_exiting)
        {
            e.Cancel = true;
            Hide();
            if (!_trayHintShown)
            {
                _trayHintShown = true;
                _tray.Notify("Vibe Wise sigue activo",
                    "Quedó en la bandeja del sistema. Clic derecho en el ícono para salir.", critical: false);
            }
            return;
        }
        base.OnClosing(e);
    }

    // ---------------------------------------------------------------- configuración

    void ReloadConfigIfChanged()
    {
        var stamp = AppConfig.Stamp();
        if (stamp == _cfgStamp) return;
        _cfg = AppConfig.Load();
        _cfgStamp = stamp;
    }

    void SaveCfg()
    {
        _cfg.Save();
        _cfgStamp = AppConfig.Stamp();
    }

    static void OpenInNotepad(string path)
    {
        try
        {
            Process.Start(new ProcessStartInfo("notepad.exe", $"\"{path}\"") { UseShellExecute = true });
        }
        catch
        {
        }
    }

    void ConfigButton_Click(object sender, RoutedEventArgs e)
    {
        if (!File.Exists(AppConfig.FilePath)) SaveCfg();
        OpenInNotepad(AppConfig.FilePath);
        Notice("Editá los umbrales y guardá: se aplican solos en el siguiente segundo.");
    }

    void LogButton_Click(object sender, RoutedEventArgs e)
    {
        AlarmLog.EnsureExists();
        OpenInNotepad(AlarmLog.FilePath);
    }

    void Notice(string text)
    {
        _notice = text;
        _noticeUntil = DateTime.Now.AddSeconds(12);
        StatusText.Text = text;
    }

    // ---------------------------------------------------------------- inicio con Windows

    async Task RefreshStartupStateAsync()
    {
        _startupEnabled = await Task.Run(StartupService.IsEnabled);
        StartupButton.Opacity = _startupEnabled ? 1 : 0.5;
    }

    async void StartupButton_Click(object sender, RoutedEventArgs e)
    {
        StartupButton.IsEnabled = false;
        try
        {
            if (!_startupEnabled)
            {
                string? how = await Task.Run(StartupService.Enable);
                _startupEnabled = how is not null;
                Notice(how is null
                    ? "No se pudo activar el inicio con Windows."
                    : $"Va a iniciar con Windows, minimizado en la bandeja ({how}).");
            }
            else
            {
                bool ok = await Task.Run(StartupService.Disable);
                _startupEnabled = !ok;
                Notice(ok ? "Ya no inicia con Windows." : "No se pudo quitar el inicio con Windows.");
            }
            StartupButton.Opacity = _startupEnabled ? 1 : 0.5;
        }
        finally
        {
            StartupButton.IsEnabled = true;
        }
    }

    // ---------------------------------------------------------------- eventos de ventana

    static string Join(params string?[] parts) =>
        string.Join("  ·  ", parts.Where(p => !string.IsNullOrEmpty(p)));

    void TitleBar_MouseLeftButtonDown(object sender, MouseButtonEventArgs e)
    {
        if (e.ClickCount == 2)
        {
            ShowCompact();
            return;
        }
        if (e.ButtonState == MouseButtonState.Pressed) DragMove();
    }

    void CompactButton_Click(object sender, RoutedEventArgs e) => ShowCompact();

    void PinButton_Click(object sender, RoutedEventArgs e)
    {
        Topmost = !Topmost;
        PinButton.Opacity = Topmost ? 1 : 0.5;
    }

    void Minimize_Click(object sender, RoutedEventArgs e) => WindowState = WindowState.Minimized;
    void Close_Click(object sender, RoutedEventArgs e) => Close();
}

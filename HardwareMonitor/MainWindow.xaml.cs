using System.Collections.ObjectModel;
using System.Windows;
using System.Windows.Input;
using System.Windows.Threading;
using VibeWise.HardwareMonitor.Models;
using VibeWise.HardwareMonitor.Services;

namespace VibeWise.HardwareMonitor;

public partial class MainWindow : Window
{
    readonly SensorReader _reader = new();
    readonly DispatcherTimer _timer = new() { Interval = TimeSpan.FromSeconds(1) };
    readonly Metric _cpu = new() { Title = "CPU" };
    readonly Metric _board = new() { Title = "Placa madre" };
    readonly Metric _gpu = new() { Title = "GPU" };
    readonly Metric _vram = new() { Title = "VRAM" };
    readonly ObservableCollection<FanItem> _fans = new();
    readonly Dictionary<string, FanItem> _fanById = new();

    Snapshot? _last;
    bool _fahrenheit;
    bool _busy;
    bool _ready;

    public MainWindow()
    {
        InitializeComponent();
        MetricsList.ItemsSource = new[] { _cpu, _board, _gpu, _vram };
        FanList.ItemsSource = _fans;
        _timer.Tick += async (_, _) => await RefreshAsync();
        Loaded += async (_, _) => await StartAsync();
        Closed += (_, _) => _reader.Dispose();
    }

    async Task StartAsync()
    {
        try
        {
            await Task.Run(_reader.Open);
            _ready = true;
        }
        catch (Exception ex)
        {
            StatusText.Text = "No se pudieron abrir los sensores (¿ejecutaste como administrador?): " + ex.Message;
            return;
        }
        await RefreshAsync();
        _timer.Start();
    }

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

    // ---- Conversión de unidades: toda la app trabaja en °C y se convierte solo al mostrar ----
    double T(double? celsius) =>
        celsius is not { } c ? double.NaN : _fahrenheit ? c * 9 / 5 + 32 : c;

    double Thr(double celsius) => T(celsius);
    string Deg => _fahrenheit ? "°F" : "°C";

    void Apply(Snapshot s)
    {
        // CPU
        SetTemp(_cpu, T(s.CpuTemp), max: 110, warn: 65, hot: 85);
        _cpu.Detail = s.CpuName ?? "CPU no detectada";
        _cpu.Detail2 = Join(
            s.CpuLoad is { } l ? $"Carga {l:0}%" : null,
            s.CpuMaxCore is { } m ? $"Núcleo máx. {T(m):0}{Deg}" : null);
        _cpu.Push(T(s.CpuTemp));

        // Placa madre
        SetTemp(_board, T(s.BoardTemp), max: 90, warn: 45, hot: 65);
        _board.Detail = s.BoardSensor is null ? "Sin sensor de placa" : $"Sensor: {s.BoardSensor}";
        _board.Detail2 = "";
        _board.Push(T(s.BoardTemp));

        // GPU
        SetTemp(_gpu, T(s.GpuTemp), max: 110, warn: 70, hot: 85);
        _gpu.Detail = s.GpuName ?? "GPU no detectada";
        _gpu.Detail2 = Join(
            s.GpuLoad is { } gl ? $"Carga {gl:0}%" : null,
            s.GpuHotSpot is { } hs ? $"Hot spot {T(hs):0}{Deg}" : null);
        _gpu.Push(T(s.GpuTemp));

        // VRAM: temperatura si la GPU la expone; si no, ocupación
        string usage = s.VramUsedMb is { } used && s.VramTotalMb is { } total
            ? $"{used / 1024:0.0} / {total / 1024:0.0} GB"
            : s.VramPercent is { } p ? $"Uso {p:0}%" : "";
        if (s.VramTemp.HasValue)
        {
            _vram.Title = "VRAM · Temperatura";
            SetTemp(_vram, T(s.VramTemp), max: 120, warn: 80, hot: 100);
            _vram.Detail = usage;
            _vram.Detail2 = s.VramPercent is { } vp ? $"Ocupación {vp:0}%" : "";
            _vram.Push(T(s.VramTemp));
        }
        else
        {
            _vram.Title = "VRAM · Ocupación";
            _vram.Unit = "%";
            _vram.Maximum = 100;
            _vram.Warn = 70;
            _vram.Hot = 90;
            _vram.Detail = usage;
            _vram.Detail2 = "Esta GPU no expone temp. de VRAM";
            _vram.Push(s.VramPercent ?? double.NaN);
        }

        UpdateFans(s.Fans);

        StatusText.Text = $"Actualizado {DateTime.Now:HH:mm:ss} · cada 1 s · datos vía LibreHardwareMonitor";
    }

    void SetTemp(Metric m, double value, double max, double warn, double hot)
    {
        m.Unit = Deg;
        m.Maximum = Thr(max);
        m.Warn = Thr(warn);
        m.Hot = Thr(hot);
    }

    void UpdateFans(IReadOnlyList<FanReading> readings)
    {
        foreach (var r in readings)
        {
            if (!_fanById.TryGetValue(r.Id, out var fan))
            {
                // Los headers vacíos de la placa reportan 0 RPM: solo mostramos los que alguna vez giraron.
                if (r.Rpm <= 0) continue;
                fan = new FanItem(r.Id, r.Name);
                _fanById[r.Id] = fan;
                _fans.Add(fan);
            }
            fan.Rpm = r.Rpm;
            fan.Maximum = Math.Max(2500, Math.Ceiling(Math.Max(fan.Maximum, r.Rpm * 1.15) / 100) * 100);
        }
        NoFans.Visibility = _fans.Count == 0 ? Visibility.Visible : Visibility.Collapsed;
    }

    static string Join(params string?[] parts) =>
        string.Join("  ·  ", parts.Where(p => !string.IsNullOrEmpty(p)));

    // ---- Eventos de ventana ----
    void TitleBar_MouseLeftButtonDown(object sender, MouseButtonEventArgs e)
    {
        if (e.ButtonState == MouseButtonState.Pressed) DragMove();
    }

    void UnitButton_Click(object sender, RoutedEventArgs e)
    {
        _fahrenheit = !_fahrenheit;
        UnitButton.Content = Deg;
        foreach (var m in new[] { _cpu, _board, _gpu, _vram }) m.ClearHistory();
        if (_last is not null) Apply(_last);
    }

    void PinButton_Click(object sender, RoutedEventArgs e)
    {
        Topmost = !Topmost;
        PinButton.Opacity = Topmost ? 1 : 0.5;
    }

    void Minimize_Click(object sender, RoutedEventArgs e) => WindowState = WindowState.Minimized;
    void Close_Click(object sender, RoutedEventArgs e) => Close();
}

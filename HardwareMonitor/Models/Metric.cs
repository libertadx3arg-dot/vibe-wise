using System.ComponentModel;
using System.Runtime.CompilerServices;
using System.Windows.Media;
using VibeWise.HardwareMonitor.Controls;
using VibeWise.HardwareMonitor.Services;

namespace VibeWise.HardwareMonitor.Models;

/// <summary>Una tarjeta del dashboard (GPU, VRAM): valor actual, historial, estadísticas y nivel de alarma.</summary>
public sealed class Metric : INotifyPropertyChanged
{
    /// <summary>Muestras guardadas: una por segundo, o sea los últimos 5 minutos.</summary>
    public const int Capacity = 300;

    static readonly Brush FrameDefault = Palette.Freeze(Color.FromArgb(0x1A, 0xFF, 0xFF, 0xFF));
    static readonly Brush FrameWarn = Palette.Freeze(Color.FromArgb(0xAA, 0xFB, 0xBF, 0x24));
    static readonly Brush FrameCrit = Palette.Freeze(Color.FromArgb(0x88, 0xF4, 0x3F, 0x5E));
    static readonly Brush TintDefault = Palette.Freeze(Color.FromArgb(0x99, 0x14, 0x1B, 0x34));
    static readonly Brush TintWarn = Palette.Freeze(Color.FromArgb(0x99, 0x26, 0x20, 0x16));
    static readonly Brush TintCritFlash = Palette.Freeze(Color.FromArgb(0xCC, 0x4A, 0x10, 0x22));
    static readonly Brush Muted = Palette.Freeze(Color.FromRgb(0x94, 0xA3, 0xB8));

    readonly List<double> _history = new();

    string _title = "";
    string _unit = "°C";
    string _detail = "";
    string _detail2 = "";
    double _value = double.NaN;
    double _maximum = 100;
    double _warn = double.NaN;
    double _crit = double.NaN;
    double _min = double.NaN;
    double _max = double.NaN;
    string _minText = "--";
    string _maxText = "--";
    string _trendText = "Midiendo…";
    Brush _trendBrush = Muted;
    IReadOnlyList<double> _historyView = Array.Empty<double>();
    AlertLevel _level = AlertLevel.Ok;
    bool _blinkOn;
    string _levelText = "SIN DATO";
    Brush _accent = Palette.IdleBrush;
    Brush _frame = FrameDefault;
    Brush _tint = TintDefault;

    public string Title { get => _title; set => Set(ref _title, value); }
    public string Unit { get => _unit; set => Set(ref _unit, value); }
    public string Detail { get => _detail; set => Set(ref _detail, value); }
    public string Detail2 { get => _detail2; set => Set(ref _detail2, value); }
    public double Value { get => _value; private set => Set(ref _value, value); }
    public double Maximum { get => _maximum; set => Set(ref _maximum, value); }
    public double Warn { get => _warn; set => Set(ref _warn, value); }
    public double Crit { get => _crit; set => Set(ref _crit, value); }

    public string MinText { get => _minText; private set => Set(ref _minText, value); }
    public string MaxText { get => _maxText; private set => Set(ref _maxText, value); }
    public string TrendText { get => _trendText; private set => Set(ref _trendText, value); }
    public Brush TrendBrush { get => _trendBrush; private set => Set(ref _trendBrush, value); }
    public IReadOnlyList<double> History { get => _historyView; private set => Set(ref _historyView, value); }

    public string LevelText { get => _levelText; private set => Set(ref _levelText, value); }
    public Brush Accent { get => _accent; private set => Set(ref _accent, value); }
    public Brush Frame { get => _frame; private set => Set(ref _frame, value); }
    public Brush Tint { get => _tint; private set => Set(ref _tint, value); }

    public AlertLevel Level => _level;

    public void SetLevel(AlertLevel level)
    {
        _level = level;
        Refresh();
    }

    /// <summary>Alterna el parpadeo del marco cuando el nivel es crítico.</summary>
    public void SetBlink(bool on)
    {
        _blinkOn = on;
        Refresh();
    }

    public void Push(double value)
    {
        Value = value;
        Refresh();
        if (double.IsNaN(value)) return;

        if (double.IsNaN(_min) || value < _min) _min = value;
        if (double.IsNaN(_max) || value > _max) _max = value;
        MinText = $"{_min:0} {Unit}";
        MaxText = $"{_max:0} {Unit}";

        _history.Add(value);
        if (_history.Count > Capacity) _history.RemoveAt(0);
        History = _history.ToArray();
        UpdateTrend();
    }

    /// <summary>Borra mínimo, máximo, tendencia e historial (p. ej. si cambia lo que mide la tarjeta).</summary>
    public void ResetStats()
    {
        _history.Clear();
        _min = _max = double.NaN;
        MinText = MaxText = "--";
        TrendText = "Midiendo…";
        TrendBrush = Muted;
        History = Array.Empty<double>();
    }

    // Compara el promedio de los últimos 5 s con el de hace ~15 s: ±1 de diferencia ya es tendencia.
    void UpdateTrend()
    {
        int n = _history.Count;
        if (n < 20)
        {
            TrendText = "Midiendo…";
            TrendBrush = Muted;
            return;
        }

        double recent = _history.Skip(n - 5).Average();
        double past = _history.Skip(n - 20).Take(5).Average();
        double delta = recent - past;
        if (delta >= 1)
        {
            TrendText = "▲ Sube";
            TrendBrush = Palette.WarmBrush;
        }
        else if (delta <= -1)
        {
            TrendText = "▼ Baja";
            TrendBrush = Palette.CoolBrush;
        }
        else
        {
            TrendText = "● Estable";
            TrendBrush = Muted;
        }
    }

    void Refresh()
    {
        bool none = double.IsNaN(_value);
        Accent = none ? Palette.IdleBrush : Palette.BrushForLevel(_level);
        LevelText = none ? "SIN DATO" : _level switch
        {
            AlertLevel.Crit => "ALARMA",
            AlertLevel.Warn => "AVISO",
            _ => "OK",
        };

        bool flash = !none && _level == AlertLevel.Crit && _blinkOn;
        Frame = none ? FrameDefault : _level switch
        {
            AlertLevel.Crit => flash ? Palette.HotBrush : FrameCrit,
            AlertLevel.Warn => FrameWarn,
            _ => FrameDefault,
        };
        Tint = flash ? TintCritFlash : _level == AlertLevel.Warn && !none ? TintWarn : TintDefault;
    }

    public event PropertyChangedEventHandler? PropertyChanged;

    void Set<T>(ref T field, T value, [CallerMemberName] string? name = null)
    {
        if (EqualityComparer<T>.Default.Equals(field, value)) return;
        field = value;
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(name));
    }
}

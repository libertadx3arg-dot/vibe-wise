using System.ComponentModel;
using System.Runtime.CompilerServices;
using System.Windows.Media;

namespace VibeWise.HardwareMonitor.Models;

/// <summary>Una tarjeta del dashboard (CPU, placa, GPU, VRAM).</summary>
public sealed class Metric : INotifyPropertyChanged
{
    const int MaxHistory = 90;
    readonly List<double> _history = new();

    string _title = "";
    string _unit = "°C";
    string _detail = "";
    string _detail2 = "";
    double _value = double.NaN;
    double _maximum = 100;
    double _warn = 60;
    double _hot = 80;
    double[] _historyView = Array.Empty<double>();
    Brush _accent = Brushes.Gray;

    public string Title { get => _title; set => Set(ref _title, value); }
    public string Unit { get => _unit; set => Set(ref _unit, value); }
    public string Detail { get => _detail; set => Set(ref _detail, value); }
    public string Detail2 { get => _detail2; set => Set(ref _detail2, value); }
    public double Value { get => _value; set => Set(ref _value, value); }
    public double Maximum { get => _maximum; set => Set(ref _maximum, value); }
    public double Warn { get => _warn; set => Set(ref _warn, value); }
    public double Hot { get => _hot; set => Set(ref _hot, value); }
    public double[] History { get => _historyView; private set => Set(ref _historyView, value); }
    public Brush Accent { get => _accent; private set => Set(ref _accent, value); }

    /// <summary>Guarda la muestra en el historial (para el sparkline) y recalcula el color.</summary>
    public void Push(double value)
    {
        Value = value;
        Accent = Controls.Palette.BrushFor(value, Warn, Hot);
        if (double.IsNaN(value)) return;
        _history.Add(value);
        if (_history.Count > MaxHistory) _history.RemoveAt(0);
        History = _history.ToArray();
    }

    public void ClearHistory()
    {
        _history.Clear();
        History = Array.Empty<double>();
    }

    public event PropertyChangedEventHandler? PropertyChanged;

    void Set<T>(ref T field, T value, [CallerMemberName] string? name = null)
    {
        if (EqualityComparer<T>.Default.Equals(field, value)) return;
        field = value;
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(name));
    }
}

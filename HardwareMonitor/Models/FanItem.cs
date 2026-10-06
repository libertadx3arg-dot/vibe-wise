using System.ComponentModel;
using System.Runtime.CompilerServices;
using System.Windows.Media;
using VibeWise.HardwareMonitor.Controls;

namespace VibeWise.HardwareMonitor.Models;

public sealed class FanItem : INotifyPropertyChanged
{
    static readonly Brush Normal = MakeGradient();

    double _observedMax;
    double _rpm;
    double _fraction;
    bool _stopped;
    string _readout = "";
    Brush _fill = Normal;

    public FanItem(string id, string name)
    {
        Id = id;
        Name = name;
    }

    public string Id { get; }
    public string Name { get; }

    public double Rpm { get => _rpm; private set => Set(ref _rpm, value); }
    public double Fraction { get => _fraction; private set => Set(ref _fraction, value); }
    public bool Stopped { get => _stopped; private set => Set(ref _stopped, value); }
    public string Readout { get => _readout; private set => Set(ref _readout, value); }
    public Brush Fill { get => _fill; private set => Set(ref _fill, value); }

    /// <param name="maxRpm">RPM del 100 %; si el ventilador lo supera, la escala crece para no pasar de 100.</param>
    public void Update(double rpm, double maxRpm, bool stopped)
    {
        _observedMax = Math.Max(_observedMax, rpm);
        double max = Math.Max(maxRpm, _observedMax);
        double frac = max <= 0 ? 0 : Math.Clamp(rpm / max, 0, 1);

        Rpm = rpm;
        Fraction = frac;
        Stopped = stopped;
        Readout = stopped ? "DETENIDO · 0 RPM" : $"{rpm:0} RPM  ·  {frac * 100:0} %";
        Fill = stopped ? Palette.HotBrush : Normal;
    }

    static Brush MakeGradient()
    {
        var b = new LinearGradientBrush(Palette.Cool, Color.FromRgb(0x2D, 0xD4, 0xBF), 0);
        b.Freeze();
        return b;
    }

    public event PropertyChangedEventHandler? PropertyChanged;

    void Set<T>(ref T field, T value, [CallerMemberName] string? name = null)
    {
        if (EqualityComparer<T>.Default.Equals(field, value)) return;
        field = value;
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(name));
    }
}

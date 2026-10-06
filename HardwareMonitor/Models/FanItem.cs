using System.ComponentModel;
using System.Runtime.CompilerServices;

namespace VibeWise.HardwareMonitor.Models;

public sealed class FanItem : INotifyPropertyChanged
{
    double _rpm;
    double _maximum = 2500;

    public FanItem(string id, string name)
    {
        Id = id;
        Name = name;
    }

    public string Id { get; }
    public string Name { get; }

    public double Rpm
    {
        get => _rpm;
        set
        {
            if (_rpm == value) return;
            _rpm = value;
            Raise();
            Raise(nameof(RpmText));
        }
    }

    /// <summary>Tope de la barra: crece si el ventilador supera lo visto hasta ahora.</summary>
    public double Maximum
    {
        get => _maximum;
        set
        {
            if (_maximum == value) return;
            _maximum = value;
            Raise();
        }
    }

    public string RpmText => $"{_rpm:0} RPM";

    public event PropertyChangedEventHandler? PropertyChanged;

    void Raise([CallerMemberName] string? name = null) =>
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(name));
}

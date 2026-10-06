using System.Windows.Media;
using VibeWise.HardwareMonitor.Services;

namespace VibeWise.HardwareMonitor.Controls;

/// <summary>Colores de estado: celeste (normal), ámbar (aviso) y rojo (crítico).</summary>
public static class Palette
{
    public static readonly Color Cool = Color.FromRgb(0x38, 0xBD, 0xF8);
    public static readonly Color Warm = Color.FromRgb(0xFB, 0xBF, 0x24);
    public static readonly Color Hot = Color.FromRgb(0xF4, 0x3F, 0x5E);
    public static readonly Color Idle = Color.FromRgb(0x64, 0x74, 0x8B);

    public static readonly Brush CoolBrush = Freeze(Cool);
    public static readonly Brush WarmBrush = Freeze(Warm);
    public static readonly Brush HotBrush = Freeze(Hot);
    public static readonly Brush IdleBrush = Freeze(Idle);

    public static Brush Freeze(Color c)
    {
        var b = new SolidColorBrush(c);
        b.Freeze();
        return b;
    }

    public static Color ForLevel(AlertLevel level) => level switch
    {
        AlertLevel.Crit => Hot,
        AlertLevel.Warn => Warm,
        _ => Cool,
    };

    public static Brush BrushForLevel(AlertLevel level) => level switch
    {
        AlertLevel.Crit => HotBrush,
        AlertLevel.Warn => WarmBrush,
        _ => CoolBrush,
    };

    /// <summary>Color por valor crudo (se usa cuando no hay un nivel con histéresis que lo decida).</summary>
    public static Color Evaluate(double value, double warn, double crit)
    {
        if (double.IsNaN(value)) return Idle;
        if (!double.IsNaN(crit) && value >= crit) return Hot;
        if (!double.IsNaN(warn) && value >= warn) return Warm;
        return Cool;
    }
}

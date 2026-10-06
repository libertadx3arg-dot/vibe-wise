using System.Windows.Media;

namespace VibeWise.HardwareMonitor.Controls;

/// <summary>Color según qué tan caliente está: celeste → ámbar → rojo.</summary>
public static class Palette
{
    static readonly Color Cool = Color.FromRgb(0x38, 0xBD, 0xF8);
    static readonly Color Warm = Color.FromRgb(0xFB, 0xBF, 0x24);
    static readonly Color Hot = Color.FromRgb(0xF4, 0x3F, 0x5E);

    public static readonly Color Idle = Color.FromRgb(0x64, 0x74, 0x8B);

    public static Color Evaluate(double value, double warn, double hot)
    {
        if (double.IsNaN(value)) return Idle;
        if (value <= warn) return Lerp(Cool, Warm, warn <= 0 ? 1 : Math.Max(0, value) / warn);
        if (value >= hot) return Hot;
        return Lerp(Warm, Hot, (value - warn) / (hot - warn));
    }

    public static Brush BrushFor(double value, double warn, double hot)
    {
        var b = new SolidColorBrush(Evaluate(value, warn, hot));
        b.Freeze();
        return b;
    }

    static Color Lerp(Color a, Color b, double t)
    {
        t = Math.Clamp(t, 0, 1);
        return Color.FromRgb(
            (byte)(a.R + (b.R - a.R) * t),
            (byte)(a.G + (b.G - a.G) * t),
            (byte)(a.B + (b.B - a.B) * t));
    }
}

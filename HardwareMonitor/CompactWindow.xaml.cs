using System.Windows;
using System.Windows.Input;
using System.Windows.Media;
using VibeWise.HardwareMonitor.Controls;
using VibeWise.HardwareMonitor.Services;

namespace VibeWise.HardwareMonitor;

/// <summary>Lo que muestra la barra compacta en cada actualización.</summary>
public sealed record CompactState(
    string GpuText, AlertLevel GpuLevel,
    string VramCaption, string VramText, AlertLevel VramLevel,
    string FanText, AlertLevel FanLevel,
    AlertLevel Overall, bool Blink);

/// <summary>Barra pequeña, sin bordes y siempre visible: GPU, VRAM y RPM de los ventiladores.</summary>
public partial class CompactWindow : Window
{
    public event Action? ExpandRequested;
    public event Action<double, double>? PositionChanged;

    public CompactWindow() => InitializeComponent();

    /// <summary>Ubica la barra donde estaba; si esa posición ya no existe (otro monitor), la trae a la vista.</summary>
    public void Place(double? left, double? top)
    {
        double vl = SystemParameters.VirtualScreenLeft, vt = SystemParameters.VirtualScreenTop;
        double vr = vl + SystemParameters.VirtualScreenWidth, vb = vt + SystemParameters.VirtualScreenHeight;

        double l = left ?? SystemParameters.WorkArea.Right - 460;
        double t = top ?? SystemParameters.WorkArea.Top + 20;
        Left = Math.Clamp(l, vl, Math.Max(vl, vr - 120));
        Top = Math.Clamp(t, vt, Math.Max(vt, vb - 60));
    }

    public void Render(CompactState s)
    {
        GpuText.Text = s.GpuText;
        VramCaption.Text = s.VramCaption;
        VramText.Text = s.VramText;
        FanText.Text = s.FanText;

        Paint(GpuText, s.GpuLevel, s.Blink);
        Paint(VramText, s.VramLevel, s.Blink);
        Paint(FanText, s.FanLevel, s.Blink);

        Root.BorderBrush = s.Overall switch
        {
            AlertLevel.Crit => s.Blink ? Palette.HotBrush : Palette.Freeze(Color.FromArgb(0x66, 0xF4, 0x3F, 0x5E)),
            AlertLevel.Warn => Palette.Freeze(Color.FromArgb(0xAA, 0xFB, 0xBF, 0x24)),
            _ => Palette.Freeze(Color.FromArgb(0x33, 0xFF, 0xFF, 0xFF)),
        };
    }

    // Celeste / ámbar / rojo según el límite; en crítico el texto parpadea.
    static void Paint(System.Windows.Controls.TextBlock tb, AlertLevel level, bool blink)
    {
        tb.Foreground = Palette.BrushForLevel(level);
        tb.Opacity = level == AlertLevel.Crit && !blink ? 0.3 : 1;
    }

    void Root_MouseLeftButtonDown(object sender, MouseButtonEventArgs e)
    {
        if (e.ClickCount == 2)
        {
            ExpandRequested?.Invoke();
            return;
        }
        if (e.ButtonState != MouseButtonState.Pressed) return;

        DragMove(); // bloquea hasta soltar el botón
        PositionChanged?.Invoke(Left, Top);
    }

    void ExpandButton_MouseLeftButtonDown(object sender, MouseButtonEventArgs e)
    {
        e.Handled = true; // que no arranque el arrastre de la barra
        ExpandRequested?.Invoke();
    }
}

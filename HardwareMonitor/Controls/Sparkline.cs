using System.Windows;
using System.Windows.Media;

namespace VibeWise.HardwareMonitor.Controls;

/// <summary>Mini gráfico de línea con relleno degradé para el historial reciente.</summary>
public sealed class Sparkline : FrameworkElement
{
    public static readonly DependencyProperty ValuesProperty = DependencyProperty.Register(
        nameof(Values), typeof(IReadOnlyList<double>), typeof(Sparkline),
        new FrameworkPropertyMetadata(Array.Empty<double>(), FrameworkPropertyMetadataOptions.AffectsRender));

    public static readonly DependencyProperty StrokeProperty = DependencyProperty.Register(
        nameof(Stroke), typeof(Brush), typeof(Sparkline),
        new FrameworkPropertyMetadata(Brushes.SkyBlue, FrameworkPropertyMetadataOptions.AffectsRender));

    public IReadOnlyList<double> Values { get => (IReadOnlyList<double>)GetValue(ValuesProperty); set => SetValue(ValuesProperty, value); }
    public Brush Stroke { get => (Brush)GetValue(StrokeProperty); set => SetValue(StrokeProperty, value); }

    protected override void OnRender(DrawingContext dc)
    {
        var v = Values;
        double w = ActualWidth, h = ActualHeight;
        if (v is null || v.Count < 2 || w < 10 || h < 10) return;

        var color = (Stroke as SolidColorBrush)?.Color ?? Colors.SkyBlue;
        double min = v.Min(), max = v.Max();
        double range = Math.Max(max - min, 8); // evita que un ruido de 1° parezca un terremoto
        double mid = (max + min) / 2;
        double lo = mid - range / 2, pad = 4;

        Point P(int i) => new(
            w * i / (v.Count - 1),
            pad + (h - pad * 2) * (1 - (v[i] - lo) / range));

        var line = new StreamGeometry();
        using (var ctx = line.Open())
        {
            ctx.BeginFigure(P(0), false, false);
            for (int i = 1; i < v.Count; i++) ctx.LineTo(P(i), true, true);
        }
        line.Freeze();

        var area = new StreamGeometry();
        using (var ctx = area.Open())
        {
            ctx.BeginFigure(new Point(0, h), true, true);
            for (int i = 0; i < v.Count; i++) ctx.LineTo(P(i), true, false);
            ctx.LineTo(new Point(w, h), true, false);
        }
        area.Freeze();

        var fill = new LinearGradientBrush(
            Color.FromArgb(0x55, color.R, color.G, color.B),
            Color.FromArgb(0x00, color.R, color.G, color.B), 90);
        fill.Freeze();

        dc.DrawGeometry(fill, null, area);
        dc.DrawGeometry(null, new Pen(new SolidColorBrush(color), 2)
        {
            LineJoin = PenLineJoin.Round, StartLineCap = PenLineCap.Round, EndLineCap = PenLineCap.Round,
        }, line);
    }
}

using System.Globalization;
using System.Windows;
using System.Windows.Media;

namespace VibeWise.HardwareMonitor.Controls;

/// <summary>
/// Gráfico de línea de los últimos N segundos (una muestra por segundo) con las líneas
/// de aviso y de crítico marcadas. La muestra más nueva queda siempre en el borde derecho.
/// </summary>
public sealed class Sparkline : FrameworkElement
{
    public static readonly DependencyProperty ValuesProperty = DependencyProperty.Register(
        nameof(Values), typeof(IReadOnlyList<double>), typeof(Sparkline),
        new FrameworkPropertyMetadata(Array.Empty<double>(), FrameworkPropertyMetadataOptions.AffectsRender));

    public static readonly DependencyProperty StrokeProperty = DependencyProperty.Register(
        nameof(Stroke), typeof(Brush), typeof(Sparkline),
        new FrameworkPropertyMetadata(Brushes.SkyBlue, FrameworkPropertyMetadataOptions.AffectsRender));

    public static readonly DependencyProperty WarnProperty = DependencyProperty.Register(
        nameof(Warn), typeof(double), typeof(Sparkline),
        new FrameworkPropertyMetadata(double.NaN, FrameworkPropertyMetadataOptions.AffectsRender));

    public static readonly DependencyProperty CritProperty = DependencyProperty.Register(
        nameof(Crit), typeof(double), typeof(Sparkline),
        new FrameworkPropertyMetadata(double.NaN, FrameworkPropertyMetadataOptions.AffectsRender));

    public static readonly DependencyProperty CapacityProperty = DependencyProperty.Register(
        nameof(Capacity), typeof(int), typeof(Sparkline),
        new FrameworkPropertyMetadata(300, FrameworkPropertyMetadataOptions.AffectsRender));

    public IReadOnlyList<double> Values { get => (IReadOnlyList<double>)GetValue(ValuesProperty); set => SetValue(ValuesProperty, value); }
    public Brush Stroke { get => (Brush)GetValue(StrokeProperty); set => SetValue(StrokeProperty, value); }
    public double Warn { get => (double)GetValue(WarnProperty); set => SetValue(WarnProperty, value); }
    public double Crit { get => (double)GetValue(CritProperty); set => SetValue(CritProperty, value); }
    public int Capacity { get => (int)GetValue(CapacityProperty); set => SetValue(CapacityProperty, value); }

    protected override void OnRender(DrawingContext dc)
    {
        double w = ActualWidth, h = ActualHeight;
        if (w < 40 || h < 30) return;

        var v = Values ?? Array.Empty<double>();
        double dpi = VisualTreeHelper.GetDpi(this).PixelsPerDip;
        var color = (Stroke as SolidColorBrush)?.Color ?? Colors.SkyBlue;

        // Escala vertical: siempre incluye las líneas de aviso y crítico, así se ve qué tan cerca está.
        bool hasWarn = !double.IsNaN(Warn), hasCrit = !double.IsNaN(Crit);
        double lo = v.Count > 0 ? v.Min() : 0, hi = v.Count > 0 ? v.Max() : 100;
        if (hasWarn) lo = Math.Min(lo, Warn - 12);
        if (hasCrit) hi = Math.Max(hi, Crit + 4);
        if (hi - lo < 10) { double mid = (hi + lo) / 2; lo = mid - 5; hi = mid + 5; }
        double range = hi - lo, padTop = 14, padBottom = 16;

        double Y(double value) => padTop + (h - padTop - padBottom) * (1 - (value - lo) / range);

        // Fondo suave con la grilla de tiempo (cada minuto).
        int cap = Math.Max(2, Capacity);
        double dx = w / (cap - 1);
        var grid = new Pen(new SolidColorBrush(Color.FromArgb(0x14, 0xFF, 0xFF, 0xFF)), 1);
        for (int s = 60; s < cap; s += 60)
            dc.DrawLine(grid, new Point(w - s * dx, padTop), new Point(w - s * dx, h - padBottom));

        DrawLimit(dc, w, Warn, "Aviso", Palette.Warm, Y, dpi);
        DrawLimit(dc, w, Crit, "Crítico", Palette.Hot, Y, dpi);

        DrawCaption(dc, "hace 5 min", new Point(2, h - 13), dpi, false, w);
        DrawCaption(dc, "ahora", new Point(w - 2, h - 13), dpi, true, w);

        if (v.Count < 2) return;

        Point P(int i) => new(w - (v.Count - 1 - i) * dx, Y(v[i]));

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
            ctx.BeginFigure(new Point(P(0).X, h - padBottom), true, true);
            for (int i = 0; i < v.Count; i++) ctx.LineTo(P(i), true, false);
            ctx.LineTo(new Point(w, h - padBottom), true, false);
        }
        area.Freeze();

        var fill = new LinearGradientBrush(
            Color.FromArgb(0x55, color.R, color.G, color.B),
            Color.FromArgb(0x00, color.R, color.G, color.B), 90);
        fill.Freeze();

        dc.DrawGeometry(fill, null, area);
        dc.DrawGeometry(null, new Pen(new SolidColorBrush(color), 2.2)
        {
            LineJoin = PenLineJoin.Round, StartLineCap = PenLineCap.Round, EndLineCap = PenLineCap.Round,
        }, line);

        // Punto en el valor actual.
        dc.DrawEllipse(new SolidColorBrush(color), null, P(v.Count - 1), 3.5, 3.5);
    }

    static void DrawLimit(DrawingContext dc, double w, double value, string label, Color color,
        Func<double, double> y, double dpi)
    {
        if (double.IsNaN(value)) return;
        double yy = y(value);
        var brush = new SolidColorBrush(Color.FromArgb(0xCC, color.R, color.G, color.B));
        brush.Freeze();
        dc.DrawLine(new Pen(brush, 1.2) { DashStyle = new DashStyle(new double[] { 4, 4 }, 0) },
            new Point(0, yy), new Point(w, yy));

        var text = new FormattedText($"{label} {value:0}°", CultureInfo.InvariantCulture, FlowDirection.LeftToRight,
            new Typeface("Segoe UI"), 10.5, brush, dpi);
        dc.DrawText(text, new Point(4, yy - text.Height - 1));
    }

    static void DrawCaption(DrawingContext dc, string s, Point at, double dpi, bool rightAligned, double w)
    {
        var text = new FormattedText(s, CultureInfo.InvariantCulture, FlowDirection.LeftToRight,
            new Typeface("Segoe UI"), 10, new SolidColorBrush(Color.FromArgb(0x90, 0x94, 0xA3, 0xB8)), dpi);
        dc.DrawText(text, new Point(rightAligned ? at.X - text.Width : at.X, at.Y));
    }
}

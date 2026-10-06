using System.Globalization;
using System.Windows;
using System.Windows.Media;
using System.Windows.Media.Animation;

namespace VibeWise.HardwareMonitor.Controls;

/// <summary>Medidor circular de 270° con brillo, marcas de aviso/crítico y animación suave.</summary>
public sealed class ArcGauge : FrameworkElement
{
    const double StartAngle = 135;
    const double Sweep = 270;

    public static readonly DependencyProperty ValueProperty = DependencyProperty.Register(
        nameof(Value), typeof(double), typeof(ArcGauge),
        new FrameworkPropertyMetadata(double.NaN, FrameworkPropertyMetadataOptions.AffectsRender, OnValueChanged));

    public static readonly DependencyProperty MaximumProperty = Reg(nameof(Maximum), 100.0);
    public static readonly DependencyProperty WarnProperty = Reg(nameof(Warn), double.NaN);
    public static readonly DependencyProperty CritProperty = Reg(nameof(Crit), double.NaN);
    public static readonly DependencyProperty UnitProperty = Reg(nameof(Unit), "°C");
    public static readonly DependencyProperty AccentProperty = Reg<Brush?>(nameof(Accent), null);

    static readonly DependencyProperty DisplayValueProperty = DependencyProperty.Register(
        nameof(DisplayValue), typeof(double), typeof(ArcGauge),
        new FrameworkPropertyMetadata(0.0, FrameworkPropertyMetadataOptions.AffectsRender));

    static DependencyProperty Reg<T>(string name, T def) => DependencyProperty.Register(
        name, typeof(T), typeof(ArcGauge),
        new FrameworkPropertyMetadata(def, FrameworkPropertyMetadataOptions.AffectsRender));

    public double Value { get => (double)GetValue(ValueProperty); set => SetValue(ValueProperty, value); }
    public double Maximum { get => (double)GetValue(MaximumProperty); set => SetValue(MaximumProperty, value); }
    public double Warn { get => (double)GetValue(WarnProperty); set => SetValue(WarnProperty, value); }
    public double Crit { get => (double)GetValue(CritProperty); set => SetValue(CritProperty, value); }
    public string Unit { get => (string)GetValue(UnitProperty); set => SetValue(UnitProperty, value); }

    /// <summary>Color del arco. Si no se define, se calcula por el valor.</summary>
    public Brush? Accent { get => (Brush?)GetValue(AccentProperty); set => SetValue(AccentProperty, value); }

    double DisplayValue => (double)GetValue(DisplayValueProperty);

    static void OnValueChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
    {
        var g = (ArcGauge)d;
        var target = (double)e.NewValue;
        if (double.IsNaN(target))
        {
            g.BeginAnimation(DisplayValueProperty, null);
            g.SetValue(DisplayValueProperty, 0.0);
            return;
        }
        g.BeginAnimation(DisplayValueProperty, new DoubleAnimation(target, TimeSpan.FromMilliseconds(700))
        {
            EasingFunction = new CubicEase { EasingMode = EasingMode.EaseOut },
        });
    }

    protected override void OnRender(DrawingContext dc)
    {
        double w = ActualWidth, h = ActualHeight;
        if (w < 40 || h < 40) return;

        double size = Math.Min(w, h);
        double thick = Math.Max(10, size * 0.075);
        var center = new Point(w / 2, h / 2);
        double radius = size / 2 - thick * 1.7;

        bool has = !double.IsNaN(Value) && !double.IsInfinity(Value);
        double shown = DisplayValue;
        double frac = has ? Math.Clamp(shown / Math.Max(1, Maximum), 0, 1) : 0;
        var color = !has ? Palette.Idle
            : Accent is SolidColorBrush sb ? sb.Color
            : Palette.Evaluate(shown, Warn, Crit);

        dc.DrawGeometry(null, RoundPen(Color.FromArgb(0x26, 0xFF, 0xFF, 0xFF), thick), Arc(center, radius, 1));

        if (frac > 0.002)
        {
            var geo = Arc(center, radius, frac);
            dc.DrawGeometry(null, RoundPen(Color.FromArgb(0x30, color.R, color.G, color.B), thick * 2.4), geo);
            dc.DrawGeometry(null, RoundPen(Color.FromArgb(0x55, color.R, color.G, color.B), thick * 1.5), geo);
            dc.DrawGeometry(null, RoundPen(color, thick), geo);
        }

        // Marcas de los límites sobre el arco: ámbar = aviso, rojo = crítico.
        DrawTick(dc, center, radius, thick, Warn, Palette.Warm);
        DrawTick(dc, center, radius, thick, Crit, Palette.Hot);

        double dpi = VisualTreeHelper.GetDpi(this).PixelsPerDip;
        var font = new FontFamily("Segoe UI Variable Display, Segoe UI");
        var big = new FormattedText(has ? shown.ToString("0", CultureInfo.InvariantCulture) : "--",
            CultureInfo.InvariantCulture, FlowDirection.LeftToRight,
            new Typeface(font, FontStyles.Normal, FontWeights.Bold, FontStretches.Normal),
            size * 0.30, Brushes.White, dpi);
        dc.DrawText(big, new Point(center.X - big.Width / 2, center.Y - big.Height * 0.62));

        var small = new FormattedText(has ? Unit : "sin dato",
            CultureInfo.InvariantCulture, FlowDirection.LeftToRight,
            new Typeface(font, FontStyles.Normal, FontWeights.Normal, FontStretches.Normal),
            size * 0.10, new SolidColorBrush(Color.FromArgb(0xC0, 0xCB, 0xD5, 0xE1)), dpi);
        dc.DrawText(small, new Point(center.X - small.Width / 2, center.Y + big.Height * 0.28));
    }

    void DrawTick(DrawingContext dc, Point c, double r, double thick, double value, Color color)
    {
        if (double.IsNaN(value) || Maximum <= 0) return;
        double a = StartAngle + Sweep * Math.Clamp(value / Maximum, 0, 1);
        var brush = new SolidColorBrush(color);
        brush.Freeze();
        dc.DrawLine(new Pen(brush, 2.5), At(c, r - thick * 0.95, a), At(c, r + thick * 0.95, a));
    }

    static Pen RoundPen(Color c, double thickness)
    {
        var brush = new SolidColorBrush(c);
        brush.Freeze();
        return new Pen(brush, thickness) { StartLineCap = PenLineCap.Round, EndLineCap = PenLineCap.Round };
    }

    static Geometry Arc(Point c, double r, double fraction)
    {
        double a1 = StartAngle + Sweep * fraction;
        var g = new StreamGeometry();
        using (var ctx = g.Open())
        {
            ctx.BeginFigure(At(c, r, StartAngle), false, false);
            ctx.ArcTo(At(c, r, a1), new Size(r, r), 0, Sweep * fraction > 180,
                SweepDirection.Clockwise, true, false);
        }
        g.Freeze();
        return g;
    }

    static Point At(Point c, double r, double degrees)
    {
        double rad = degrees * Math.PI / 180;
        return new Point(c.X + r * Math.Cos(rad), c.Y + r * Math.Sin(rad));
    }
}

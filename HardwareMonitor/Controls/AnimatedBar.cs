using System.Windows;
using System.Windows.Media;
using System.Windows.Media.Animation;

namespace VibeWise.HardwareMonitor.Controls;

/// <summary>Barra de progreso redondeada (0..1) que se desliza suavemente hacia el valor nuevo.</summary>
public sealed class AnimatedBar : FrameworkElement
{
    public static readonly DependencyProperty ValueProperty = DependencyProperty.Register(
        nameof(Value), typeof(double), typeof(AnimatedBar),
        new FrameworkPropertyMetadata(0.0, FrameworkPropertyMetadataOptions.AffectsRender, OnValueChanged));

    public static readonly DependencyProperty FillProperty = DependencyProperty.Register(
        nameof(Fill), typeof(Brush), typeof(AnimatedBar),
        new FrameworkPropertyMetadata(Brushes.SkyBlue, FrameworkPropertyMetadataOptions.AffectsRender));

    static readonly DependencyProperty DisplayValueProperty = DependencyProperty.Register(
        nameof(DisplayValue), typeof(double), typeof(AnimatedBar),
        new FrameworkPropertyMetadata(0.0, FrameworkPropertyMetadataOptions.AffectsRender));

    static readonly Brush Track = Palette.Freeze(Color.FromArgb(0x24, 0xFF, 0xFF, 0xFF));

    public double Value { get => (double)GetValue(ValueProperty); set => SetValue(ValueProperty, value); }
    public Brush Fill { get => (Brush)GetValue(FillProperty); set => SetValue(FillProperty, value); }
    double DisplayValue => (double)GetValue(DisplayValueProperty);

    static void OnValueChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
    {
        ((AnimatedBar)d).BeginAnimation(DisplayValueProperty,
            new DoubleAnimation(Math.Clamp((double)e.NewValue, 0, 1), TimeSpan.FromMilliseconds(600))
            {
                EasingFunction = new CubicEase { EasingMode = EasingMode.EaseOut },
            });
    }

    protected override void OnRender(DrawingContext dc)
    {
        double w = ActualWidth, h = ActualHeight;
        if (w < 4 || h < 2) return;

        double r = h / 2;
        dc.DrawRoundedRectangle(Track, null, new Rect(0, 0, w, h), r, r);

        double frac = Math.Clamp(DisplayValue, 0, 1);
        if (frac > 0.003)
            dc.DrawRoundedRectangle(Fill, null, new Rect(0, 0, Math.Max(h, w * frac), h), r, r);
    }
}

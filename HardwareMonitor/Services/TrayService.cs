using Drawing = System.Drawing;
using WinForms = System.Windows.Forms;

namespace VibeWise.HardwareMonitor.Services;

/// <summary>Ícono en la bandeja del sistema con menú y avisos de Windows.</summary>
public sealed class TrayService : IDisposable
{
    readonly WinForms.NotifyIcon _icon;

    public event Action? OpenRequested;
    public event Action? CompactRequested;
    public event Action? ExitRequested;

    public TrayService()
    {
        var menu = new WinForms.ContextMenuStrip();
        menu.Items.Add("Abrir ventana", null, (_, _) => OpenRequested?.Invoke());
        menu.Items.Add("Modo compacto", null, (_, _) => CompactRequested?.Invoke());
        menu.Items.Add(new WinForms.ToolStripSeparator());
        menu.Items.Add("Salir", null, (_, _) => ExitRequested?.Invoke());

        _icon = new WinForms.NotifyIcon
        {
            Icon = MakeIcon(),
            Text = "Vibe Wise · Monitor de GPU",
            Visible = true,
            ContextMenuStrip = menu,
        };
        _icon.MouseDoubleClick += (_, e) =>
        {
            if (e.Button == WinForms.MouseButtons.Left) OpenRequested?.Invoke();
        };
    }

    public void Notify(string title, string text, bool critical)
    {
        _icon.ShowBalloonTip(6000, title, text, critical ? WinForms.ToolTipIcon.Error : WinForms.ToolTipIcon.Info);
    }

    static Drawing.Icon MakeIcon()
    {
        using var bmp = new Drawing.Bitmap(32, 32);
        using (var g = Drawing.Graphics.FromImage(bmp))
        {
            g.SmoothingMode = Drawing.Drawing2D.SmoothingMode.AntiAlias;
            g.Clear(Drawing.Color.Transparent);
            using var fill = new Drawing.SolidBrush(Drawing.Color.FromArgb(56, 189, 248));
            g.FillEllipse(fill, 1, 1, 30, 30);
            using var pen = new Drawing.Pen(Drawing.Color.White, 3.2f);
            g.DrawArc(pen, 8, 8, 16, 16, 135, 270);
        }
        return Drawing.Icon.FromHandle(bmp.GetHicon());
    }

    public void Dispose()
    {
        _icon.Visible = false;
        _icon.Dispose();
    }
}

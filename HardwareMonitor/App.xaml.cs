using System.Windows;

namespace VibeWise.HardwareMonitor;

public partial class App : Application
{
    // Se mantiene vivo mientras corre la app: evita dos instancias (p. ej. inicio automático + doble clic).
    static Mutex? _single;

    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);

        _single = new Mutex(true, "VibeWiseMonitor.SingleInstance", out bool first);
        if (!first)
        {
            Shutdown();
            return;
        }

        var window = new MainWindow();
        MainWindow = window;
        // Al apagar Windows la X no debe frenar el cierre.
        SessionEnding += (_, _) => window.MarkExiting();
        window.Begin(e.Args.Contains("--minimized"));
    }
}

using System.Globalization;

namespace VibeWise.HardwareMonitor.Services;

public enum AlertLevel { Ok = 0, Warn = 1, Crit = 2 }

public sealed record AlarmEvent(DateTime Time, string Sensor, AlertLevel Level, double Value, string Unit, string Message);

/// <summary>Estado de alarmas por sensor, con histéresis para que no oscilen entre niveles.</summary>
public sealed class AlarmEngine
{
    readonly Dictionary<string, AlertLevel> _levels = new();
    readonly Dictionary<string, int> _stopCount = new();

    public AlertLevel GetLevel(string key) => _levels.TryGetValue(key, out var l) ? l : AlertLevel.Ok;

    public void Reset(string key)
    {
        _levels.Remove(key);
        _stopCount.Remove(key);
    }

    public static AlertLevel Worst(AlertLevel a, AlertLevel b) => a >= b ? a : b;

    /// <summary>Sube de nivel al llegar al límite y solo baja cuando cae <paramref name="hyst"/> °C por debajo.</summary>
    public AlarmEvent? EvaluateTemp(string key, string sensor, double value, double warn, double crit, double hyst)
    {
        if (double.IsNaN(value)) return null;

        var prev = GetLevel(key);
        var l = prev;
        if (l == AlertLevel.Crit && value < crit - hyst) l = AlertLevel.Warn;
        if (l == AlertLevel.Warn && value < warn - hyst) l = AlertLevel.Ok;
        if (l < AlertLevel.Crit && value >= crit) l = AlertLevel.Crit;
        if (l < AlertLevel.Warn && value >= warn) l = AlertLevel.Warn;

        if (l == prev) return null;
        _levels[key] = l;

        string msg = l switch
        {
            AlertLevel.Crit => $"{sensor} CRÍTICO: {value:0} °C (límite {crit:0} °C)",
            AlertLevel.Warn when prev == AlertLevel.Crit => $"{sensor} bajó a AVISO: {value:0} °C",
            AlertLevel.Warn => $"{sensor} en AVISO: {value:0} °C (límite {warn:0} °C)",
            _ => $"{sensor} volvió a la normalidad: {value:0} °C",
        };
        return new AlarmEvent(DateTime.Now, sensor, l, value, "°C", msg);
    }

    /// <summary>
    /// Ventilador detenido: 0 RPM con la GPU caliente durante varias lecturas seguidas
    /// (para no disparar por un cero suelto). Se apaga cuando gira de nuevo o la GPU se enfría.
    /// </summary>
    public AlarmEvent? EvaluateFan(string key, string name, double rpm, double gpuTemp,
        double tempLimit, double hyst, int confirmSamples = 3)
    {
        var prev = GetLevel(key);
        var l = prev;
        bool hot = !double.IsNaN(gpuTemp) && gpuTemp > tempLimit;

        if (prev == AlertLevel.Crit)
        {
            bool cleared = rpm >= 1 || double.IsNaN(gpuTemp) || gpuTemp <= tempLimit - hyst;
            if (cleared)
            {
                l = AlertLevel.Ok;
                _stopCount[key] = 0;
            }
        }
        else
        {
            int n = rpm < 1 && hot ? _stopCount.GetValueOrDefault(key) + 1 : 0;
            _stopCount[key] = n;
            if (n >= confirmSamples) l = AlertLevel.Crit;
        }

        if (l == prev) return null;
        _levels[key] = l;

        string msg = l == AlertLevel.Crit
            ? $"{name} DETENIDO (0 RPM) con la GPU a {gpuTemp:0} °C"
            : rpm >= 1
                ? $"{name} volvió a girar ({rpm:0} RPM)"
                : $"{name}: la GPU se enfrió, fin de la alarma de ventilador detenido";
        return new AlarmEvent(DateTime.Now, name, l, rpm, "RPM", msg);
    }
}

/// <summary>Registro de eventos en %APPDATA%\VibeWiseMonitor\alarmas.log (una línea por evento).</summary>
public static class AlarmLog
{
    static readonly object Gate = new();

    public static string FilePath => Path.Combine(AppConfig.Directory, "alarmas.log");

    public static void Write(AlarmEvent e)
    {
        string level = e.Level switch { AlertLevel.Crit => "CRITICO", AlertLevel.Warn => "AVISO", _ => "NORMAL" };
        string value = e.Value.ToString("0.0", CultureInfo.InvariantCulture) + " " + e.Unit;
        string line = string.Join('\t', e.Time.ToString("yyyy-MM-dd"), e.Time.ToString("HH:mm:ss"),
            e.Sensor, level, value, e.Message);
        try
        {
            lock (Gate)
            {
                Directory.CreateDirectory(AppConfig.Directory);
                File.AppendAllText(FilePath, line + Environment.NewLine);
            }
        }
        catch
        {
            // Registrar nunca debe tirar abajo la app.
        }
    }

    public static void EnsureExists()
    {
        try
        {
            Directory.CreateDirectory(AppConfig.Directory);
            if (!File.Exists(FilePath))
                File.WriteAllText(FilePath, "fecha\thora\tsensor\tnivel\tvalor\tmensaje" + Environment.NewLine);
        }
        catch
        {
        }
    }
}

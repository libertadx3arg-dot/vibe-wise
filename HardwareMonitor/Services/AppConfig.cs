using System.Text.Json;

namespace VibeWise.HardwareMonitor.Services;

/// <summary>
/// Configuración guardada en %APPDATA%\VibeWiseMonitor\config.json. Se puede editar a mano:
/// la app detecta el cambio y lo aplica sin reiniciar. Todas las temperaturas están en °C.
/// </summary>
public sealed class AppConfig
{
    public double GpuWarn { get; set; } = 80;
    public double GpuCritical { get; set; } = 87;
    public double VramWarn { get; set; } = 87;
    public double VramCritical { get; set; } = 93;

    /// <summary>Margen para volver a un nivel más bajo (evita que la alarma oscile).</summary>
    public double HysteresisC { get; set; } = 3;

    /// <summary>Alarma de ventilador detenido: RPM = 0 con la GPU por encima de esta temperatura.</summary>
    public double FanStoppedGpuTempC { get; set; } = 60;

    /// <summary>Cantidad de ventiladores físicos de la GPU (para la nota de los que no reportan RPM).</summary>
    public int GpuFanCount { get; set; } = 3;

    /// <summary>RPM que equivalen al 100 % de la barra (se amplía sola si un ventilador lo supera).</summary>
    public double FanMaxRpm { get; set; } = 3000;

    public bool SoundEnabled { get; set; } = true;
    public int SoundRepeatSeconds { get; set; } = 3;
    public bool NotificationsEnabled { get; set; } = true;

    public bool CompactMode { get; set; }
    public double? CompactLeft { get; set; }
    public double? CompactTop { get; set; }

    static readonly JsonSerializerOptions Options = new()
    {
        WriteIndented = true,
        ReadCommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true,
    };

    public static string Directory =>
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "VibeWiseMonitor");

    public static string FilePath => Path.Combine(Directory, "config.json");

    public static DateTime Stamp() =>
        File.Exists(FilePath) ? File.GetLastWriteTimeUtc(FilePath) : DateTime.MinValue;

    public static AppConfig Load()
    {
        if (!File.Exists(FilePath))
        {
            var fresh = new AppConfig();
            fresh.Save();
            return fresh;
        }

        try
        {
            var cfg = JsonSerializer.Deserialize<AppConfig>(File.ReadAllText(FilePath), Options) ?? new AppConfig();
            cfg.Sanitize();
            return cfg;
        }
        catch
        {
            // Archivo con errores de sintaxis: usamos los valores por defecto pero NO lo pisamos.
            return new AppConfig();
        }
    }

    public void Save()
    {
        try
        {
            System.IO.Directory.CreateDirectory(Directory);
            File.WriteAllText(FilePath, JsonSerializer.Serialize(this, Options));
        }
        catch
        {
            // Sin permisos o disco lleno: la app sigue funcionando con lo que tiene en memoria.
        }
    }

    void Sanitize()
    {
        if (GpuCritical <= GpuWarn) GpuCritical = GpuWarn + 1;
        if (VramCritical <= VramWarn) VramCritical = VramWarn + 1;
        HysteresisC = Math.Clamp(HysteresisC, 0, 15);
        SoundRepeatSeconds = Math.Clamp(SoundRepeatSeconds, 1, 120);
        FanMaxRpm = Math.Max(500, FanMaxRpm);
        GpuFanCount = Math.Max(0, GpuFanCount);
    }
}

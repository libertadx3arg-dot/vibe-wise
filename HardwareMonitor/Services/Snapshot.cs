namespace VibeWise.HardwareMonitor.Services;

public sealed record FanReading(string Id, double Rpm);

/// <summary>Lectura de la GPU en un instante. Temperaturas en °C, memoria en MB.</summary>
public sealed record Snapshot(
    string? GpuName,
    double? GpuTemp,
    double? GpuHotSpot,
    double? GpuLoad,
    double? VramTemp,
    double? VramUsedMb,
    double? VramTotalMb,
    double? VramPercent,
    IReadOnlyList<FanReading> Fans);

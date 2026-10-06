namespace VibeWise.HardwareMonitor.Services;

public sealed record FanReading(string Id, string Name, double Rpm);

/// <summary>Lectura de todos los sensores en un instante. Temperaturas en °C.</summary>
public sealed record Snapshot(
    string? CpuName,
    double? CpuTemp,
    double? CpuMaxCore,
    double? CpuLoad,
    double? BoardTemp,
    string? BoardSensor,
    string? GpuName,
    double? GpuTemp,
    double? GpuHotSpot,
    double? GpuLoad,
    double? VramTemp,
    double? VramUsedMb,
    double? VramTotalMb,
    double? VramPercent,
    IReadOnlyList<FanReading> Fans);

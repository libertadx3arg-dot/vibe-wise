using LibreHardwareMonitor.Hardware;

namespace VibeWise.HardwareMonitor.Services;

/// <summary>
/// Lee solo la GPU con LibreHardwareMonitor. Sin CPU ni placa madre no se necesita el
/// driver de bajo nivel (el que bloquea la Integridad de memoria): NVIDIA/AMD se leen por su API.
/// </summary>
public sealed class SensorReader : IDisposable
{
    Computer? _computer;

    public void Open()
    {
        _computer = new Computer { IsGpuEnabled = true };
        _computer.Open();
    }

    public Snapshot Read()
    {
        if (_computer is null) throw new InvalidOperationException("SensorReader no está abierto.");

        var all = Flatten(_computer.Hardware).ToList();
        foreach (var hw in all) hw.Update();

        // Preferimos la GPU dedicada (NVIDIA/AMD) sobre la integrada.
        var gpu = all.FirstOrDefault(h => h.HardwareType is HardwareType.GpuNvidia or HardwareType.GpuAmd)
                  ?? all.FirstOrDefault(h => h.HardwareType == HardwareType.GpuIntel);
        if (gpu is null)
            return new Snapshot(null, null, null, null, null, null, null, null, Array.Empty<FanReading>());

        var temps = Sensors(gpu, SensorType.Temperature);
        double? core = Pick(temps, "GPU Core", "GPU Temperature");
        double? hotSpot = temps.FirstOrDefault(s => s.Name.Contains("Hot Spot", StringComparison.OrdinalIgnoreCase))?.Value;
        double? vramTemp = temps.FirstOrDefault(s => s.Name.Contains("Memory", StringComparison.OrdinalIgnoreCase))?.Value;

        var loads = Sensors(gpu, SensorType.Load);
        double? load = loads.FirstOrDefault(s => s.Name.Equals("GPU Core", StringComparison.OrdinalIgnoreCase))?.Value;

        var data = Sensors(gpu, SensorType.SmallData).Concat(Sensors(gpu, SensorType.Data)).ToList();
        double? used = data.FirstOrDefault(s => s.Name.Equals("GPU Memory Used", StringComparison.OrdinalIgnoreCase))?.Value
                       ?? data.FirstOrDefault(s => s.Name.Contains("Dedicated Memory Used", StringComparison.OrdinalIgnoreCase))?.Value;
        double? total = data.FirstOrDefault(s => s.Name.Equals("GPU Memory Total", StringComparison.OrdinalIgnoreCase))?.Value;
        double? pct = used.HasValue && total is > 0
            ? used / total * 100
            : loads.FirstOrDefault(s => s.Name.Equals("GPU Memory", StringComparison.OrdinalIgnoreCase))?.Value;

        // Solo los ventiladores que realmente reportan RPM; el orden fija "Ventilador 1", "Ventilador 2"…
        var fans = Sensors(gpu, SensorType.Fan)
            .Where(s => s.Value.HasValue)
            .OrderBy(s => s.Index).ThenBy(s => s.Name, StringComparer.OrdinalIgnoreCase)
            .Select(s => new FanReading(s.Identifier.ToString(), s.Value!.Value))
            .ToList();

        return new Snapshot(gpu.Name, core, hotSpot, load, vramTemp, used, total, pct, fans);
    }

    static IEnumerable<IHardware> Flatten(IEnumerable<IHardware> roots)
    {
        foreach (var hw in roots)
        {
            yield return hw;
            foreach (var sub in Flatten(hw.SubHardware)) yield return sub;
        }
    }

    static List<ISensor> Sensors(IHardware hw, SensorType type) =>
        hw.Sensors.Where(s => s.SensorType == type).ToList();

    /// <summary>Primer sensor cuyo nombre contenga alguno de los preferidos; si no hay, el máximo.</summary>
    static double? Pick(List<ISensor> sensors, params string[] preferred)
    {
        foreach (var p in preferred)
        {
            var s = sensors.FirstOrDefault(x => x.Value.HasValue &&
                x.Name.Contains(p, StringComparison.OrdinalIgnoreCase));
            if (s is not null) return s.Value;
        }
        return sensors.Where(x => x.Value.HasValue).OrderByDescending(x => x.Value).FirstOrDefault()?.Value;
    }

    public void Dispose() => _computer?.Close();
}

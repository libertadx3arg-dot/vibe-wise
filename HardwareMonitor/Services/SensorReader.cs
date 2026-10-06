using LibreHardwareMonitor.Hardware;

namespace VibeWise.HardwareMonitor.Services;

/// <summary>Envuelve LibreHardwareMonitor y devuelve un <see cref="Snapshot"/> por lectura.</summary>
public sealed class SensorReader : IDisposable
{
    Computer? _computer;

    public void Open()
    {
        _computer = new Computer
        {
            IsCpuEnabled = true,
            IsGpuEnabled = true,
            IsMotherboardEnabled = true,
            IsControllerEnabled = true,
        };
        _computer.Open();
    }

    public Snapshot Read()
    {
        if (_computer is null) throw new InvalidOperationException("SensorReader no está abierto.");

        var all = Flatten(_computer.Hardware).ToList();
        foreach (var hw in all) hw.Update();

        // CPU
        var cpu = all.FirstOrDefault(h => h.HardwareType == HardwareType.Cpu);
        var cpuTemps = Sensors(cpu, SensorType.Temperature);
        var cpuTemp = Pick(cpuTemps, "Package", "Tctl", "Tdie", "Average");
        var cpuMax = Pick(cpuTemps, "Core Max").Value;
        var cpuLoad = Sensors(cpu, SensorType.Load)
            .FirstOrDefault(s => s.Name.Contains("Total", StringComparison.OrdinalIgnoreCase))?.Value;

        // Placa madre (los sensores cuelgan del chip Super I/O, un sub-hardware)
        var boardTemps = all
            .Where(h => h.HardwareType is HardwareType.Motherboard or HardwareType.SuperIO
                                         or HardwareType.EmbeddedController)
            .SelectMany(h => Sensors(h, SensorType.Temperature))
            .ToList();
        var board = Pick(boardTemps, "Motherboard", "System", "Chipset", "PCH");

        // GPU: preferimos la dedicada (NVIDIA/AMD) sobre la integrada
        var gpu = all.FirstOrDefault(h => h.HardwareType is HardwareType.GpuNvidia or HardwareType.GpuAmd)
                  ?? all.FirstOrDefault(h => h.HardwareType == HardwareType.GpuIntel);
        var gpuTemps = Sensors(gpu, SensorType.Temperature);
        var gpuCore = Pick(gpuTemps, "GPU Core", "GPU Temperature").Value;
        var hotSpot = gpuTemps.FirstOrDefault(s => s.Name.Contains("Hot Spot", StringComparison.OrdinalIgnoreCase))?.Value;
        var vramTemp = gpuTemps.FirstOrDefault(s => s.Name.Contains("Memory", StringComparison.OrdinalIgnoreCase))?.Value;
        var gpuLoad = Sensors(gpu, SensorType.Load)
            .FirstOrDefault(s => s.Name.Equals("GPU Core", StringComparison.OrdinalIgnoreCase))?.Value;

        var data = Sensors(gpu, SensorType.SmallData).Concat(Sensors(gpu, SensorType.Data)).ToList();
        double? used = data.FirstOrDefault(s => s.Name.Equals("GPU Memory Used", StringComparison.OrdinalIgnoreCase))?.Value
                       ?? data.FirstOrDefault(s => s.Name.Contains("Dedicated Memory Used", StringComparison.OrdinalIgnoreCase))?.Value;
        double? total = data.FirstOrDefault(s => s.Name.Equals("GPU Memory Total", StringComparison.OrdinalIgnoreCase))?.Value;
        double? pct = used.HasValue && total is > 0
            ? used / total * 100
            : Sensors(gpu, SensorType.Load)
                .FirstOrDefault(s => s.Name.Equals("GPU Memory", StringComparison.OrdinalIgnoreCase))?.Value;

        // Ventiladores: de la placa, la GPU, el CPU o controladoras externas
        var fans = new List<FanReading>();
        foreach (var hw in all)
        {
            foreach (var s in Sensors(hw, SensorType.Fan))
            {
                if (s.Value is not { } rpm) continue;
                fans.Add(new FanReading(s.Identifier.ToString(), $"{Category(hw.HardwareType)} · {s.Name}", rpm));
            }
        }

        return new Snapshot(
            cpu?.Name, cpuTemp.Value, cpuMax, cpuLoad,
            board.Value, board.Name,
            gpu?.Name, gpuCore, hotSpot, gpuLoad,
            vramTemp, used, total, pct,
            fans);
    }

    static string Category(HardwareType t) => t switch
    {
        HardwareType.Cpu => "CPU",
        HardwareType.GpuNvidia or HardwareType.GpuAmd or HardwareType.GpuIntel => "GPU",
        HardwareType.Motherboard or HardwareType.SuperIO or HardwareType.EmbeddedController => "Placa",
        _ => "Ctrl",
    };

    static IEnumerable<IHardware> Flatten(IEnumerable<IHardware> roots)
    {
        foreach (var hw in roots)
        {
            yield return hw;
            foreach (var sub in Flatten(hw.SubHardware)) yield return sub;
        }
    }

    // Solo los sensores del propio nodo (los sub-hardware se recorren aparte con Flatten).
    static List<ISensor> Sensors(IHardware? hw, SensorType type) =>
        hw is null ? new() : hw.Sensors.Where(s => s.SensorType == type).ToList();

    /// <summary>Primer sensor cuyo nombre contenga alguno de los preferidos; si no hay, el máximo.</summary>
    static (double? Value, string? Name) Pick(List<ISensor> sensors, params string[] preferred)
    {
        foreach (var p in preferred)
        {
            var s = sensors.FirstOrDefault(x => x.Value.HasValue &&
                x.Name.Contains(p, StringComparison.OrdinalIgnoreCase));
            if (s is not null) return (s.Value, s.Name);
        }
        var best = sensors.Where(x => x.Value.HasValue).OrderByDescending(x => x.Value).FirstOrDefault();
        return best is null ? (null, null) : (best.Value, best.Name);
    }

    public void Dispose() => _computer?.Close();
}

# Vibe Wise · Monitor de hardware

App de escritorio para Windows (WPF / .NET 8) con un dashboard oscuro y animado que muestra en tiempo real:

- **CPU**: temperatura del paquete, carga y núcleo más caliente
- **Placa madre**: temperatura del chipset/sistema (vía Super I/O)
- **GPU**: temperatura, hot spot y carga
- **VRAM**: temperatura de la memoria (si la GPU la expone) y ocupación en GB
- **Ventiladores**: RPM de todos los que reporten lectura (placa, GPU, controladoras)

Medidores circulares con color según temperatura (celeste → ámbar → rojo), mini-gráficos con el historial, botón °C/°F y modo "siempre visible".

Los sensores se leen con [LibreHardwareMonitorLib](https://github.com/LibreHardwareMonitor/LibreHardwareMonitor).

## Compilar

Requiere Windows y el [SDK de .NET 8](https://dotnet.microsoft.com/download).

```powershell
cd HardwareMonitor
dotnet run -c Release
```

Para generar un `.exe` único y autocontenido:

```powershell
dotnet publish -c Release -r win-x64 --self-contained -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -o out
```

El workflow `.github/workflows/hardware-monitor.yml` hace lo mismo en GitHub Actions y deja el `.exe` como artefacto.

## Notas

- **Se ejecuta como administrador** (el manifiesto lo pide): sin eso el driver no puede leer los sensores de la placa y el CPU.
- Algunos antivirus marcan el driver embebido de LibreHardwareMonitor; es un falso positivo conocido de este tipo de herramientas.
- Cada fabricante de placa expone sensores distintos. Si algo aparece como "sin dato", es que tu hardware no lo publica.
- Las GPU NVIDIA de consumo normalmente **no** exponen temperatura de VRAM; en ese caso la tarjeta muestra la ocupación de VRAM.

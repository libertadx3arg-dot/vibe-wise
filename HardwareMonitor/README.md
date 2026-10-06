# Vibe Wise · Monitor de GPU

App de escritorio para Windows (WPF / .NET 8) con un dashboard oscuro y animado para vigilar la **GPU**:

- **GPU**: temperatura, hot spot y carga
- **VRAM**: temperatura de la memoria (si la GPU la expone) u ocupación en GB
- **Ventiladores**: nombre, RPM y porcentaje con barra animada

Cada tarjeta tiene un medidor circular grande con las marcas de aviso/crítico, el historial de los últimos 5 minutos con las líneas de límite, mínimo y máximo de la sesión y la tendencia (sube / baja / estable). Arriba hay una barra de estado general: **Todo OK / Aviso / ALARMA**.

Los sensores se leen con [LibreHardwareMonitorLib](https://github.com/LibreHardwareMonitor/LibreHardwareMonitor), solo para la GPU (NVAPI/ADL). **No lee CPU ni placa madre**, así que no usa el driver de bajo nivel que bloquea la *Integridad de memoria* y **no pide administrador**.

## Modo compacto

Botón ▭ o doble clic en el título: queda una barra pequeña, sin bordes, siempre visible y arrastrable con GPU, VRAM y RPM de los ventiladores (celeste / ámbar / rojo según el límite). Recuerda su posición. Doble clic en la barra (o ⤢) vuelve a la ventana completa.

## Alarmas

Umbrales por defecto (editables en `%APPDATA%\VibeWiseMonitor\config.json`, se aplican sin reiniciar; el botón ⚙ lo abre):

| Sensor | Aviso (ámbar) | Crítico (rojo) |
|---|---|---|
| GPU | 80 °C | 87 °C |
| VRAM | 87 °C | 93 °C |

- Al pasar el aviso: ámbar. Al pasar el crítico: rojo parpadeante, sonido repetido y notificación de Windows. Un clic en la barra de estado silencia el sonido.
- Histéresis de 3 °C (`HysteresisC`): una alarma solo baja de nivel cuando la temperatura cae 3 °C por debajo del límite.
- **Ventilador detenido**: 0 RPM con la GPU por encima de 60 °C (`FanStoppedGpuTempC`) durante 3 lecturas seguidas.
- Cada evento (fecha, hora, sensor, nivel, valor, mensaje) se anota en `%APPDATA%\VibeWiseMonitor\alarmas.log` (botón 🗒).

Ventiladores: se rotulan "Ventilador 1", "Ventilador 2"… según los que la GPU reporta. `GpuFanCount` (3 por defecto) indica cuántos tiene físicamente; si reporta menos, se muestra la nota correspondiente.

## Arranque y bandeja

- La X **no cierra**: manda la app a la bandeja del sistema (clic derecho en el ícono → Salir).
- El botón ⏻ crea una tarea programada que inicia la app al iniciar sesión, minimizada en la bandeja. Si Windows no deja crearla, pide permiso (UAC) y, como último recurso, usa la clave `Run` del usuario.

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

- Si tu GPU no expone la temperatura de la VRAM (típico en GeForce de consumo), la tarjeta muestra la ocupación y no genera alarmas de VRAM.
- Si en tu equipo la GPU no se lee sin administrador, cambiá `requestedExecutionLevel` a `requireAdministrator` en `app.manifest`.

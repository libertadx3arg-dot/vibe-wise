using System.Diagnostics;
using System.Security;
using System.Security.Principal;
using System.Text;
using Microsoft.Win32;

namespace VibeWise.HardwareMonitor.Services;

/// <summary>
/// Inicio con Windows mediante una tarea programada (al iniciar sesión, con 20 s de espera).
/// Si Windows no deja crearla, se usa la clave Run del usuario como respaldo.
/// </summary>
public static class StartupService
{
    const string TaskName = "VibeWiseMonitor";
    const string RunKey = @"Software\Microsoft\Windows\CurrentVersion\Run";

    static string ExePath => Environment.ProcessPath ?? "";

    public static bool IsEnabled() => Run($"/Query /TN \"{TaskName}\"", elevated: false) == 0 || HasRunValue();

    /// <summary>Devuelve cómo quedó configurado ("tarea programada" / "registro") o null si falló.</summary>
    public static string? Enable()
    {
        if (ExePath.Length == 0) return null;

        string xml = Path.Combine(Path.GetTempPath(), "vibewise-task.xml");
        try
        {
            File.WriteAllText(xml, BuildTaskXml(), Encoding.Unicode);
            string args = $"/Create /TN \"{TaskName}\" /XML \"{xml}\" /F";
            int code = Run(args, elevated: false);
            if (code != 0) code = Run(args, elevated: true); // pide permiso (UAC) si hace falta
            if (code == 0)
            {
                RemoveRunValue();
                return "tarea programada";
            }
        }
        catch
        {
        }
        finally
        {
            try { File.Delete(xml); } catch { }
        }

        try
        {
            using var key = Registry.CurrentUser.OpenSubKey(RunKey, writable: true);
            key?.SetValue(TaskName, $"\"{ExePath}\" --minimized");
            return key is null ? null : "registro de Windows";
        }
        catch
        {
            return null;
        }
    }

    public static bool Disable()
    {
        bool ok = true;
        if (Run($"/Query /TN \"{TaskName}\"", elevated: false) == 0)
        {
            string args = $"/Delete /TN \"{TaskName}\" /F";
            int code = Run(args, elevated: false);
            if (code != 0) code = Run(args, elevated: true);
            ok = code == 0;
        }
        RemoveRunValue();
        return ok;
    }

    static string BuildTaskXml()
    {
        string user = SecurityElement.Escape(WindowsIdentity.GetCurrent().Name) ?? "";
        string exe = SecurityElement.Escape($"\"{ExePath}\"") ?? "";
        return $"""
            <?xml version="1.0" encoding="UTF-16"?>
            <Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
              <RegistrationInfo><Description>Vibe Wise · Monitor de GPU</Description></RegistrationInfo>
              <Triggers>
                <LogonTrigger><Enabled>true</Enabled><UserId>{user}</UserId><Delay>PT20S</Delay></LogonTrigger>
              </Triggers>
              <Principals>
                <Principal id="Author"><UserId>{user}</UserId><LogonType>InteractiveToken</LogonType><RunLevel>LeastPrivilege</RunLevel></Principal>
              </Principals>
              <Settings>
                <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
                <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
                <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
                <StartWhenAvailable>true</StartWhenAvailable>
                <ExecutionTimeLimit>PT0S</ExecutionTimeLimit>
                <Enabled>true</Enabled>
              </Settings>
              <Actions Context="Author">
                <Exec><Command>{exe}</Command><Arguments>--minimized</Arguments></Exec>
              </Actions>
            </Task>
            """;
    }

    static int Run(string args, bool elevated)
    {
        try
        {
            var psi = new ProcessStartInfo("schtasks.exe", args)
            {
                CreateNoWindow = true,
                WindowStyle = ProcessWindowStyle.Hidden,
            };
            if (elevated)
            {
                psi.UseShellExecute = true;
                psi.Verb = "runas";
            }
            else
            {
                psi.UseShellExecute = false;
                psi.RedirectStandardOutput = true;
                psi.RedirectStandardError = true;
            }

            using var p = Process.Start(psi);
            if (p is null) return -1;
            if (!elevated)
            {
                p.StandardOutput.ReadToEnd();
                p.StandardError.ReadToEnd();
            }
            p.WaitForExit();
            return p.ExitCode;
        }
        catch
        {
            return -1; // incluye "el usuario canceló el permiso"
        }
    }

    static bool HasRunValue()
    {
        try
        {
            using var key = Registry.CurrentUser.OpenSubKey(RunKey);
            return key?.GetValue(TaskName) is not null;
        }
        catch
        {
            return false;
        }
    }

    static void RemoveRunValue()
    {
        try
        {
            using var key = Registry.CurrentUser.OpenSubKey(RunKey, writable: true);
            key?.DeleteValue(TaskName, throwOnMissingValue: false);
        }
        catch
        {
        }
    }
}

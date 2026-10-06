// Anti-spam: Cloudflare Turnstile + límite de consultas por IP.
// Sin TURNSTILE_SECRET_KEY (modo prueba en tu compu) la verificación se saltea.
// LÍMITE POR IP: esta versión cuenta en memoria, que en Cloudflare es débil (cada instancia
// cuenta por separado). PENDIENTE (Fase 7): guardar el conteo en Supabase o Cloudflare KV.

export async function verificarTurnstile(token: string | undefined, ip: string, secret: string | undefined): Promise<boolean> {
  if (!secret) return true;
  if (!token) return false;
  const body = new URLSearchParams({ secret, response: token, remoteip: ip });
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  const j = (await r.json()) as { success?: boolean };
  return j.success === true;
}

const ventana = new Map<string, number[]>();
export function limitePorIp(ip: string, max = 5, minutos = 60): boolean {
  const ahora = Date.now();
  const desde = ahora - minutos * 60_000;
  const golpes = (ventana.get(ip) ?? []).filter((t) => t > desde);
  if (golpes.length >= max) { ventana.set(ip, golpes); return false; }
  golpes.push(ahora);
  ventana.set(ip, golpes);
  return true;
}

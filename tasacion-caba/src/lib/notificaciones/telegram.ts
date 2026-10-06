// Avisos a tu Telegram. Nunca rompen la web: si Telegram falla, se anota en el log y se sigue.
// El token y el chat ID van en variables de entorno (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID), nunca en el código.
type Env = Record<string, string | undefined>;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export async function avisarTelegram(env: Env, textoHtml: string, f: typeof fetch = fetch): Promise<boolean> {
  const token = env.TELEGRAM_BOT_TOKEN, chat = env.TELEGRAM_CHAT_ID;
  if (!token || !chat) { console.warn('[modo prueba] Telegram sin configurar, aviso no enviado.'); return false; }
  try {
    const r = await f(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text: textoHtml, parse_mode: 'HTML', disable_web_page_preview: true }),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) console.warn('Telegram respondió', r.status);
    return r.ok;
  } catch (e) { console.warn('No se pudo avisar por Telegram:', (e as Error).message); return false; }
}

const PLAZOS: Record<string, string> = { ya: 'Ya', '6_meses': '6 meses', '1_anio': '1 año', solo_saber: 'Solo quiere saber' };
const link = (env: Env, ruta: string) => (env.PUBLIC_SITE_URL ? `\n<a href="${esc(env.PUBLIC_SITE_URL)}${ruta}">Abrir en el panel</a>` : '');

export interface AvisoPropietario { barrio: string; tipo: string; supTerreno: number | null; rango: string; plazo: string | null }

export function textoNuevoPropietario(env: Env, a: AvisoPropietario): string {
  return [
    '🏠 <b>Nuevo propietario</b>',
    `Barrio: ${esc(a.barrio)}`, `Tipo: ${esc(a.tipo)}`,
    `Terreno: ${a.supTerreno ? a.supTerreno + ' m²' : 'no sabe'}`,
    `Estimación: ${esc(a.rango)}`, `Plazo: ${esc(PLAZOS[a.plazo ?? ''] ?? 'sin dato')}`,
  ].join('\n') + link(env, '/admin/propietarios');
}
export function textoNuevoDesarrollador(env: Env, empresa: string): string {
  return `🏗️ <b>Nuevo desarrollador para aprobar</b>\nEmpresa: ${esc(empresa || 'sin dato')}` + link(env, '/admin/desarrolladores');
}
export function textoMeInteresa(env: Env, empresa: string, barrio: string): string {
  return `⭐ <b>Un desarrollador marcó "Me interesa"</b>\nEmpresa: ${esc(empresa || 'sin dato')}\nOportunidad en: ${esc(barrio)}` + link(env, '/admin/oportunidades');
}

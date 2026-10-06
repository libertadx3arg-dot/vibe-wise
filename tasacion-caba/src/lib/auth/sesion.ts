// Sesión con link mágico de Supabase. No usa contraseñas.
// Las cookies guardan el token de acceso y el de renovación; son httpOnly (el JavaScript del navegador no las lee).
import type { AstroCookies } from 'astro';
import { clienteServidor } from '../db/supabase';

export interface Usuario { id: string; email: string }
type Env = Record<string, string | undefined>;

const AT = 'pb_at', RT = 'pb_rt';
const seguro = (env: Env) => (env.PUBLIC_SITE_URL ?? '').startsWith('https://');
const opciones = (env: Env, maxAge: number) => ({ httpOnly: true, secure: seguro(env), sameSite: 'lax' as const, path: '/', maxAge });

export function guardarSesion(cookies: AstroCookies, env: Env, at: string, rt: string | undefined, expiraEn: number) {
  cookies.set(AT, at, opciones(env, Math.max(60, expiraEn)));
  if (rt) cookies.set(RT, rt, opciones(env, 60 * 60 * 24 * 30));
}
export function cerrarSesion(cookies: AstroCookies) { cookies.delete(AT, { path: '/' }); cookies.delete(RT, { path: '/' }); }

/** Devuelve el usuario logueado (con email verificado) o null. Renueva el token si venció. */
export async function usuarioActual(cookies: AstroCookies, env: Env): Promise<Usuario | null> {
  const db = clienteServidor(env);
  if (!db) return null;
  const at = cookies.get(AT)?.value;
  if (at) {
    const { data } = await db.auth.getUser(at);
    if (data.user?.email) return { id: data.user.id, email: data.user.email.toLowerCase() };
  }
  const rt = cookies.get(RT)?.value;
  if (rt) {
    const { data } = await db.auth.refreshSession({ refresh_token: rt });
    const s = data.session;
    if (s?.user?.email) {
      guardarSesion(cookies, env, s.access_token, s.refresh_token, s.expires_in ?? 3600);
      return { id: s.user.id, email: s.user.email.toLowerCase() };
    }
  }
  return null;
}

export const esAdmin = (u: Usuario | null, env: Env) =>
  !!u && !!env.ADMIN_EMAIL && u.email === env.ADMIN_EMAIL.trim().toLowerCase();

/** Solo rutas internas ("/algo"), para que el link mágico no pueda mandar a un sitio externo. */
export function rutaInternaSegura(next: unknown, porDefecto = '/'): string {
  return typeof next === 'string' && /^\/(?![\/\\])[\w\-./?=&%]*$/.test(next) ? next : porDefecto;
}

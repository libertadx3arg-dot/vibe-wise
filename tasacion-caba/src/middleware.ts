// Middleware: corre antes de cada página y endpoint.
//  1. Bloquea pedidos de escritura que vengan de otro sitio (defensa contra CSRF).
//  2. Protege /admin y /api/admin: solo el email de ADMIN_EMAIL.
//  3. Carga el usuario logueado en las rutas que lo necesitan.
import { defineMiddleware } from 'astro:middleware';
import { getEnv } from './lib/env';
import { esAdmin, usuarioActual } from './lib/auth/sesion';
import { CABECERAS, CSP } from './lib/seguridad/cabeceras';

const NECESITA_USUARIO = /^\/(admin|api\/admin|desarrollador\/(perfil|catalogo)|api\/desarrollador\/(perfil|me-interesa)|propietario\/mis-informes)(\/|$)/;

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, url, locals, cookies } = context;
  const env = getEnv(locals);

  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    const origen = request.headers.get('origin');
    // Un Origin ajeno, ilegible o "null" se bloquea.
    let origenHost: string | null = null;
    if (origen) { try { origenHost = new URL(origen).host; } catch { origenHost = ''; } }
    if (origen && origenHost !== url.host) return new Response('Origen no permitido', { status: 403 });
  }

  if (NECESITA_USUARIO.test(url.pathname)) {
    const usuario = await usuarioActual(cookies, env);
    (locals as any).usuario = usuario;
    if (/^\/(admin|api\/admin)(\/|$)/.test(url.pathname) && !esAdmin(usuario, env)) {
      if (url.pathname.startsWith('/api/')) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: usuario ? 403 : 401, headers: { 'content-type': 'application/json' } });
      return context.redirect('/acceso?rol=admin&next=' + encodeURIComponent(url.pathname));
    }
  }
  const respuesta = await next();
  if (NECESITA_USUARIO.test(url.pathname)) respuesta.headers.set('cache-control', 'private, no-store');
  for (const [k, v] of Object.entries(CABECERAS)) respuesta.headers.set(k, v);
  // La CSP estricta solo en producción: en tu compu, Astro necesita scripts propios para su barra de desarrollo.
  if (import.meta.env.PROD) respuesta.headers.set('content-security-policy', CSP);
  return respuesta;
});

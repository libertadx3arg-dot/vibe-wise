// Registro de desarrollador: queda "pendiente de aprobación" hasta que el administrador lo apruebe.
import type { APIRoute } from 'astro';
import { getEnv } from '../../../lib/env';
import { BARRIOS_CABA } from '../../../config/barrios';
import { clienteAnon, clienteServidor } from '../../../lib/db/supabase';
import { limitePorIp, verificarTurnstile } from '../../../lib/seguridad/antispam';
import { validarContacto, validarPerfil } from '../../../lib/negocio/desarrolladores';
import { avisarTelegram, textoNuevoDesarrollador } from '../../../lib/notificaciones/telegram';

const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json' } });

export const POST: APIRoute = async ({ request, locals, clientAddress }) => {
  const env = getEnv(locals);
  let b: any; try { b = await request.json(); } catch { return json({ error: 'Datos inválidos.' }, 400); }
  if (!limitePorIp('reg:' + clientAddress, 5, 60)) return json({ error: 'Hiciste muchos intentos seguidos. Probá en un rato.' }, 429);
  if (!(await verificarTurnstile(b.turnstile, clientAddress, env.TURNSTILE_SECRET_KEY))) return json({ error: 'No pudimos verificar que no sos un robot.' }, 400);

  const c = validarContacto(b); if (!c.ok) return json({ error: c.error }, 400);
  const p = validarPerfil(b, BARRIOS_CABA.map((x) => x.nombre)); if (!p.ok) return json({ error: p.error }, 400);

  const db = clienteServidor(env);
  if (!db) return json({ error: 'El registro todavía no está habilitado.' }, 503);

  const { error } = await db.from('desarrolladores').insert({ ...c.datos, ...p.datos, estado: 'pendiente' });
  if (error && error.code !== '23505') { console.error('Registro de desarrollador:', error.message); return json({ error: 'No pudimos guardar tu solicitud. Probá de nuevo.' }, 500); }
  // Si ya existía (23505) respondemos igual: no revelamos qué emails están registrados, y no pisamos sus datos.
  if (!error) await avisarTelegram(env, textoNuevoDesarrollador(env, c.datos.empresa));

  const anon = clienteAnon(env);
  if (anon && env.PUBLIC_SITE_URL && limitePorIp('mail:' + c.datos.email, 3, 60)) {
    await anon.auth.signInWithOtp({ email: c.datos.email, options: { emailRedirectTo: `${env.PUBLIC_SITE_URL}/auth/callback?next=${encodeURIComponent('/desarrollador/catalogo')}`, shouldCreateUser: true } })
      .then((r) => r.error && console.warn('Link mágico:', r.error.message));
  }
  return json({ ok: true, mensaje: 'Recibimos tu solicitud. Revisamos tu perfil y te avisamos. Te mandamos también un link a tu email para entrar cuando esté aprobado.' });
};

// Pide el envío del link mágico. Siempre responde lo mismo, exista o no la cuenta
// (así nadie puede averiguar qué emails están registrados).
import type { APIRoute } from 'astro';
import { getEnv } from '../../../lib/env';
import { clienteAnon, clienteServidor } from '../../../lib/db/supabase';
import { limitePorIp, verificarTurnstile } from '../../../lib/seguridad/antispam';
import { rutaInternaSegura } from '../../../lib/auth/sesion';

const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json' } });
const RESPUESTA_OK = { ok: true, mensaje: 'Si el email corresponde a una cuenta, te enviamos un link para entrar. Revisá tu correo (y el spam).' };

export const POST: APIRoute = async ({ request, locals, clientAddress }) => {
  const env = getEnv(locals);
  let b: any; try { b = await request.json(); } catch { return json({ error: 'Datos inválidos.' }, 400); }
  const email = String(b.email ?? '').trim().toLowerCase().slice(0, 150);
  const rol = ['desarrollador', 'propietario', 'admin'].includes(b.rol) ? b.rol : '';
  if (!/^\S+@\S+\.\S+$/.test(email) || !rol) return json({ error: 'Revisá el email.' }, 400);

  if (!limitePorIp('ip:' + clientAddress, 10, 60) || !limitePorIp('mail:' + email, 3, 60)) return json({ error: 'Pediste muchos links seguidos. Probá en un rato.' }, 429);
  if (!(await verificarTurnstile(b.turnstile, clientAddress, env.TURNSTILE_SECRET_KEY))) return json({ error: 'No pudimos verificar que no sos un robot.' }, 400);

  const db = clienteServidor(env), anon = clienteAnon(env);
  if (!db || !anon || !env.PUBLIC_SITE_URL) return json({ error: 'El acceso por email todavía no está configurado.' }, 503);

  // Solo se manda el link si la cuenta corresponde al rol pedido.
  let corresponde = false;
  if (rol === 'admin') corresponde = !!env.ADMIN_EMAIL && email === env.ADMIN_EMAIL.trim().toLowerCase();
  else if (rol === 'desarrollador') corresponde = !!(await db.from('desarrolladores').select('id').eq('email', email).maybeSingle()).data;
  else corresponde = !!(await db.from('propietarios').select('id').eq('email', email).limit(1)).data?.length;

  if (corresponde) {
    const next = rutaInternaSegura(b.next, rol === 'admin' ? '/admin' : rol === 'desarrollador' ? '/desarrollador/catalogo' : '/propietario/mis-informes');
    const { error } = await anon.auth.signInWithOtp({ email, options: { emailRedirectTo: `${env.PUBLIC_SITE_URL}/auth/callback?next=${encodeURIComponent(next)}`, shouldCreateUser: true } });
    if (error) console.warn('No se pudo enviar el link mágico:', error.message);
  }
  return json(RESPUESTA_OK);
};

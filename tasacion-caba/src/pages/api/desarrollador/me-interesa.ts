import type { APIRoute } from 'astro';
import { getEnv } from '../../../lib/env';
import { clienteServidor } from '../../../lib/db/supabase';
import { marcarInteres } from '../../../lib/negocio/desarrolladores';
import { avisarTelegram, textoMeInteresa } from '../../../lib/notificaciones/telegram';

const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json' } });

export const POST: APIRoute = async ({ request, locals }) => {
  const env = getEnv(locals);
  const usuario = (locals as any).usuario;
  if (!usuario) return json({ error: 'Tenés que entrar con tu email.' }, 401);
  let b: any; try { b = await request.json(); } catch { return json({ error: 'Datos inválidos.' }, 400); }
  const db = clienteServidor(env); if (!db) return json({ error: 'No disponible.' }, 503);
  const { data: dev } = await db.from('desarrolladores').select('id,estado,empresa').eq('email', usuario.email).maybeSingle();
  if (!dev) return json({ error: 'No encontramos tu cuenta.' }, 404);
  const r = await marcarInteres(db, dev, String(b.oportunidadId ?? ''));
  if (r.resultado === 'no_aprobado') return json({ error: 'Tu perfil todavía no está aprobado.' }, 403);
  if (r.resultado === 'no_existe') return json({ error: 'Esa oportunidad ya no está disponible.' }, 404);
  if (r.resultado === 'ok') await avisarTelegram(env, textoMeInteresa(env, dev.empresa, r.barrio ?? ''));
  return json({ ok: true });
};

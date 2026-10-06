import type { APIRoute } from 'astro';
import { getEnv } from '../../../lib/env';
import { BARRIOS_CABA } from '../../../config/barrios';
import { clienteServidor } from '../../../lib/db/supabase';
import { validarPerfil } from '../../../lib/negocio/desarrolladores';

const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json' } });

export const POST: APIRoute = async ({ request, locals }) => {
  const usuario = (locals as any).usuario;
  if (!usuario) return json({ error: 'Tenés que entrar con tu email.' }, 401);
  let b: any; try { b = await request.json(); } catch { return json({ error: 'Datos inválidos.' }, 400); }
  const p = validarPerfil(b, BARRIOS_CABA.map((x) => x.nombre)); if (!p.ok) return json({ error: p.error }, 400);
  const db = clienteServidor(getEnv(locals)); if (!db) return json({ error: 'No disponible.' }, 503);
  // Solo se actualiza el perfil de búsqueda del dueño del email; nunca el estado de aprobación.
  const { data } = await db.from('desarrolladores').update(p.datos).eq('email', usuario.email).select('id');
  if (!data?.length) return json({ error: 'No encontramos tu cuenta.' }, 404);
  return json({ ok: true, mensaje: 'Guardamos tu perfil de búsqueda.' });
};

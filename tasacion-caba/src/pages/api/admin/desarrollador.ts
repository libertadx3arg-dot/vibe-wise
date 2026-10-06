import type { APIRoute } from 'astro';
import { exigirAdmin, respuestaJson as json } from '../../../lib/auth/admin';

export const POST: APIRoute = async ({ request, locals }) => {
  const a = exigirAdmin(locals); if (a instanceof Response) return a;
  const b: any = await request.json().catch(() => ({}));
  if (!['pendiente', 'aprobado', 'rechazado'].includes(b.estado) || !b.id) return json({ error: 'Datos inválidos.' }, 400);
  const { error } = await a.db.from('desarrolladores').update({ estado: b.estado }).eq('id', String(b.id));
  return error ? json({ error: 'No se pudo guardar.' }, 500) : json({ ok: true }, 200);
};

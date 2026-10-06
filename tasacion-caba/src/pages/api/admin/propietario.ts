import type { APIRoute } from 'astro';
import { exigirAdmin, respuestaJson as json } from '../../../lib/auth/admin';
import { texto } from '../../../lib/negocio/validar';

const ESTADOS = ['nuevo', 'contactado', 'en_proceso', 'descartado'];

export const POST: APIRoute = async ({ request, locals }) => {
  const a = exigirAdmin(locals); if (a instanceof Response) return a;
  const b: any = await request.json().catch(() => ({}));
  if (!ESTADOS.includes(b.estado) || !b.id) return json({ error: 'Datos inválidos.' }, 400);
  const { error } = await a.db.from('propietarios').update({ estado: b.estado, notas: texto(b.notas, 2000) || null }).eq('id', String(b.id));
  return error ? json({ error: 'No se pudo guardar.' }, 500) : json({ ok: true }, 200);
};

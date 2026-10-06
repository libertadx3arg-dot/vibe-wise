// Edita la tabla de valores por barrio. Campo vacío = PENDIENTE (null).
import type { APIRoute } from 'astro';
import { exigirAdmin, respuestaJson as json } from '../../../lib/auth/admin';
import { BARRIOS_CABA } from '../../../config/barrios';
import { numero } from '../../../lib/negocio/validar';

export const POST: APIRoute = async ({ request, locals }) => {
  const a = exigirAdmin(locals); if (a instanceof Response) return a;
  const b: any = await request.json().catch(() => ({}));
  if (!BARRIOS_CABA.some((x) => x.nombre === b.nombre)) return json({ error: 'Barrio inválido.' }, 400);
  const vacio = (v: unknown) => v === '' || v === null || v === undefined;
  const incidencia = vacio(b.incidencia_usd) ? null : numero(b.incidencia_usd, 100000);
  const factor = vacio(b.factor_edificabilidad) ? null : numero(b.factor_edificabilidad, 50);
  if ((!vacio(b.incidencia_usd) && incidencia === null) || (!vacio(b.factor_edificabilidad) && factor === null)) return json({ error: 'Revisá los números (usá punto o coma para decimales).' }, 400);
  const { error } = await a.db.from('barrios').upsert({ nombre: b.nombre, incidencia_usd: incidencia, factor_edificabilidad: factor, actualizado_en: new Date().toISOString() });
  return error ? json({ error: 'No se pudo guardar.' }, 500) : json({ ok: true }, 200);
};

import type { APIRoute } from 'astro';
import { exigirAdmin, respuestaJson as json } from '../../../lib/auth/admin';
import { crearOportunidad, ponerOkDelDueno, ponerPublicada } from '../../../lib/negocio/admin';

const MENSAJES: Record<string, string> = {
  sin_datos: 'No se puede crear: falta la superficie construible o el inmueble está protegido.',
  ya_existe: 'Ya existe una oportunidad para este propietario.',
  no_existe: 'No se encontró el registro.',
  falta_ok: 'Para publicar, primero tildá que el dueño dio su OK.',
};

export const POST: APIRoute = async ({ request, locals }) => {
  const a = exigirAdmin(locals); if (a instanceof Response) return a;
  const b: any = await request.json().catch(() => ({}));
  const id = String(b.id ?? '');
  if (!id) return json({ error: 'Datos inválidos.' }, 400);
  let r: string = 'ok';
  if (b.accion === 'crear') r = await crearOportunidad(a.db, id);
  else if (b.accion === 'publicar') r = await ponerPublicada(a.db, id, true);
  else if (b.accion === 'despublicar') r = await ponerPublicada(a.db, id, false);
  else if (b.accion === 'ok_dueno') await ponerOkDelDueno(a.db, id, true);
  else if (b.accion === 'quitar_ok_dueno') await ponerOkDelDueno(a.db, id, false);
  else if (b.accion === 'borrar') await a.db.from('oportunidades').delete().eq('id', id);
  else return json({ error: 'Acción inválida.' }, 400);
  return r === 'ok' ? json({ ok: true }, 200) : json({ error: MENSAJES[r] ?? 'No se pudo.' }, 400);
};

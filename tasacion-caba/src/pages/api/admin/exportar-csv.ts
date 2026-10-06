import type { APIRoute } from 'astro';
import { exigirAdmin, respuestaJson as json } from '../../../lib/auth/admin';
import { aCsv, TABLAS_CSV } from '../../../lib/negocio/admin';

export const GET: APIRoute = async ({ url, locals }) => {
  const a = exigirAdmin(locals); if (a instanceof Response) return a;
  const tabla = url.searchParams.get('tabla') ?? '';
  const columnas = TABLAS_CSV[tabla];
  if (!columnas) return json({ error: 'Tabla inválida.' }, 400);
  const { data, error } = await a.db.from(tabla).select(columnas.join(',')).order('creado_en', { ascending: false }).limit(10000);
  if (error) return json({ error: 'No se pudo exportar.' }, 500);
  return new Response(aCsv(data ?? [], columnas), {
    headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="planobase-${tabla}-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
};

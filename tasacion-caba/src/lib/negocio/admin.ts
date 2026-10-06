// Acciones del panel de administración.

export async function crearOportunidad(db: any, propietarioId: string): Promise<'ok' | 'sin_datos' | 'ya_existe' | 'no_existe'> {
  const { data: p } = await db.from('propietarios').select('id,barrio,sup_terreno,resultado').eq('id', propietarioId).maybeSingle();
  if (!p) return 'no_existe';
  const r = p.resultado ?? {};
  if (!p.barrio || typeof r.m2Construibles !== 'number' || r.tipo === 'protegido') return 'sin_datos';
  const { data: ya } = await db.from('oportunidades').select('id').eq('propietario_id', p.id).maybeSingle();
  if (ya) return 'ya_existe';
  const { error } = await db.from('oportunidades').insert({
    propietario_id: p.id, barrio: p.barrio, m2_terreno: p.sup_terreno, m2_construibles: r.m2Construibles,
    min_usd: r.tipo === 'ok' ? r.minUsd : null, max_usd: r.tipo === 'ok' ? r.maxUsd : null,
  });
  return error ? 'sin_datos' : 'ok';
}

/** Publicar solo se permite si el dueño dio su OK. Despublicar siempre se puede. */
export async function ponerPublicada(db: any, id: string, publicada: boolean): Promise<'ok' | 'falta_ok' | 'no_existe'> {
  const { data: o } = await db.from('oportunidades').select('id,ok_del_dueno').eq('id', id).maybeSingle();
  if (!o) return 'no_existe';
  if (publicada && !o.ok_del_dueno) return 'falta_ok';
  await db.from('oportunidades').update({ publicada }).eq('id', id);
  return 'ok';
}

export async function ponerOkDelDueno(db: any, id: string, ok: boolean) {
  // Si se retira el OK, también se despublica.
  await db.from('oportunidades').update(ok ? { ok_del_dueno: true } : { ok_del_dueno: false, publicada: false }).eq('id', id);
}

/** CSV seguro: comillas escapadas y sin fórmulas (una celda que empieza con = + - @ se neutraliza para Excel). */
export function aCsv(filas: Record<string, unknown>[], columnas: string[]): string {
  const celda = (v: unknown) => {
    let s = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  };
  return '﻿' + [columnas.join(','), ...filas.map((f) => columnas.map((c) => celda(f[c])).join(','))].join('\r\n');
}

export const TABLAS_CSV: Record<string, string[]> = {
  propietarios: ['creado_en', 'nombre', 'whatsapp', 'email', 'direccion', 'barrio', 'tipo', 'sup_terreno', 'sup_construida', 'protegido', 'estado_inmueble', 'mas_duenos', 'sucesion', 'plazo', 'estado', 'notas', 'resultado'],
  desarrolladores: ['creado_en', 'nombre', 'empresa', 'email', 'whatsapp', 'cuit', 'barrios', 'm2_terreno_min', 'm2_terreno_max', 'm2_construibles_buscados', 'presupuesto_usd', 'tipo_proyecto', 'estado'],
  oportunidades: ['creado_en', 'barrio', 'm2_terreno', 'm2_construibles', 'min_usd', 'max_usd', 'ok_del_dueno', 'publicada'],
  intereses: ['creado_en', 'oportunidad_id', 'desarrollador_id'],
};

// Reglas del recorrido del desarrollador: registro, perfil, catálogo anónimo y "Me interesa".
import { emailValido, numero, texto } from './validar.ts';

/** ÚNICAS columnas que se le muestran a un desarrollador. Nunca agregar propietario_id, dirección ni datos del dueño. */
export const COLUMNAS_CATALOGO = 'id,barrio,m2_terreno,m2_construibles,min_usd,max_usd';
export const TIPOS_PROYECTO = ['vivienda', 'oficinas', 'mixto'];

export interface PerfilBusqueda {
  barrios: string[]; m2_terreno_min: number | null; m2_terreno_max: number | null;
  m2_construibles_buscados: number | null; presupuesto_usd: number | null; tipo_proyecto: string | null;
}
export interface Oportunidad { id: string; barrio: string; m2_terreno: number | null; m2_construibles: number | null; min_usd: number | null; max_usd: number | null }
type Res<T> = { ok: true; datos: T } | { ok: false; error: string };

export function validarPerfil(b: any, barriosValidos: string[]): Res<PerfilBusqueda> {
  const barrios = Array.isArray(b?.barrios) ? [...new Set(b.barrios.map((x: unknown) => texto(x, 60)))].filter((x) => barriosValidos.includes(x as string)) as string[] : [];
  const p: PerfilBusqueda = {
    barrios, m2_terreno_min: numero(b?.m2_terreno_min, 1e6), m2_terreno_max: numero(b?.m2_terreno_max, 1e6),
    m2_construibles_buscados: numero(b?.m2_construibles_buscados, 1e7), presupuesto_usd: numero(b?.presupuesto_usd),
    tipo_proyecto: TIPOS_PROYECTO.includes(b?.tipo_proyecto) ? b.tipo_proyecto : null,
  };
  if (p.m2_terreno_min !== null && p.m2_terreno_max !== null && p.m2_terreno_min > p.m2_terreno_max) return { ok: false, error: 'Los m² mínimos no pueden ser mayores que los máximos.' };
  return { ok: true, datos: p };
}

export function validarContacto(b: any): Res<{ nombre: string; empresa: string; email: string; whatsapp: string; cuit: string | null }> {
  const nombre = texto(b?.nombre, 100), empresa = texto(b?.empresa, 120), email = texto(b?.email, 150).toLowerCase(), whatsapp = texto(b?.whatsapp, 30);
  const cuit = texto(b?.cuit, 20).replace(/\D/g, '');
  if (!nombre || !empresa) return { ok: false, error: 'Completá tu nombre y el de la empresa.' };
  if (!emailValido(email)) return { ok: false, error: 'Revisá el email.' };
  if (whatsapp.replace(/\D/g, '').length < 8) return { ok: false, error: 'Revisá el WhatsApp.' };
  if (cuit && cuit.length !== 11) return { ok: false, error: 'El CUIT tiene que tener 11 números (o dejalo vacío).' };
  return { ok: true, datos: { nombre, empresa, email, whatsapp, cuit: cuit || null } };
}

/** ¿La oportunidad coincide con lo que busca? Un dato que falta en la oportunidad no la descarta. */
export function coincide(p: PerfilBusqueda, o: Oportunidad): boolean {
  const criterios = (p.barrios.length ? 1 : 0) + [p.m2_terreno_min, p.m2_terreno_max, p.m2_construibles_buscados, p.presupuesto_usd].filter((x) => x !== null).length;
  if (criterios === 0) return false; // sin criterios cargados no marcamos nada
  if (p.barrios.length && !p.barrios.includes(o.barrio)) return false;
  if (o.m2_terreno !== null) {
    if (p.m2_terreno_min !== null && o.m2_terreno < p.m2_terreno_min) return false;
    if (p.m2_terreno_max !== null && o.m2_terreno > p.m2_terreno_max) return false;
  }
  if (p.m2_construibles_buscados !== null && o.m2_construibles !== null && o.m2_construibles < p.m2_construibles_buscados) return false;
  if (p.presupuesto_usd !== null && o.min_usd !== null && o.min_usd > p.presupuesto_usd) return false;
  return true;
}

export async function listarCatalogo(db: any, perfil: PerfilBusqueda) {
  const { data } = await db.from('oportunidades').select(COLUMNAS_CATALOGO).eq('publicada', true).order('creado_en', { ascending: false });
  return ((data ?? []) as Oportunidad[]).map((o) => ({ ...o, coincide: coincide(perfil, o) }));
}

export type ResultadoInteres = 'ok' | 'ya' | 'no_aprobado' | 'no_existe';
export async function marcarInteres(db: any, desarrollador: { id: string; estado: string }, oportunidadId: string): Promise<{ resultado: ResultadoInteres; barrio?: string }> {
  if (desarrollador.estado !== 'aprobado') return { resultado: 'no_aprobado' };
  const { data: op } = await db.from('oportunidades').select('id,barrio,publicada').eq('id', oportunidadId).maybeSingle();
  if (!op || !op.publicada) return { resultado: 'no_existe' };
  const { error } = await db.from('intereses').insert({ oportunidad_id: op.id, desarrollador_id: desarrollador.id });
  if (error) return error.code === '23505' ? { resultado: 'ya', barrio: op.barrio } : { resultado: 'no_existe' };
  return { resultado: 'ok', barrio: op.barrio };
}

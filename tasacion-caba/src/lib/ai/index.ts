// Capa de IA intercambiable: cambiar de proveedor = cambiar AI_PROVIDER / AI_MODEL / AI_API_KEY.
// Reglas:
//  - A la IA NUNCA se le mandan datos personales: solo inmueble + resultado del cálculo (ver DatosInforme).
//  - Si la IA falla, tarda demasiado o no está configurada → informe de plantilla. La web nunca se rompe por la IA.
//  - Los informes de IA se guardan en caché por consulta.
import type { CacheInformes, DatosInforme, InformeGenerado, ProveedorIA } from './tipos.ts';
import { informePlantilla } from './plantilla.ts';
import { SITIO } from '../../config/sitio.ts';
import { gemini } from './proveedores/gemini.ts';
import { claude } from './proveedores/claude.ts';
import { openai } from './proveedores/openai.ts';

type Env = Record<string, string | undefined>;
const TIEMPO_MAX_MS = 12_000;

export function elegirProveedor(env: Env, f: typeof fetch = fetch): ProveedorIA | null {
  const nombre = env.AI_PROVIDER?.trim().toLowerCase();
  const modelo = env.AI_MODEL?.trim();
  const clave = env.AI_API_KEY?.trim();
  if (!nombre || !modelo || !clave || modelo === 'PENDIENTE') return null;
  if (nombre === 'gemini') return gemini(clave, modelo, f);
  if (nombre === 'claude') return claude(clave, modelo, f);
  if (nombre === 'openai') return openai(clave, modelo, f);
  return null;
}

export function armarPrompt(d: DatosInforme): string {
  return [
    'Sos un asistente de una web inmobiliaria argentina. Escribí un informe corto (3 a 5 párrafos simples) en español rioplatense,',
    'para una persona que no sabe de inmobiliaria, sobre cuánto podría interesarle su propiedad a un desarrollador.',
    'Reglas estrictas:',
    '- Usá SOLO los datos de abajo. No inventes cifras, normativa, plazos ni barrios.',
    '- Si no hay precio en el resultado, NO des ningún precio ni lo estimes.',
    '- Sin promesas ni frases como "vendé rápido" o "el mejor precio". Tono profesional y honesto.',
    '- Texto plano, sin viñetas, sin títulos, sin markdown.',
    '- No pidas datos personales ni menciones que sos una IA.',
    '',
    'Datos del inmueble y resultado del cálculo (JSON):',
    JSON.stringify(d),
  ].join('\n');
}

async function hash(d: DatosInforme): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(d));
  const h = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function generarInforme(
  datos: DatosInforme, env: Env, cache?: CacheInformes, f: typeof fetch = fetch,
): Promise<InformeGenerado> {
  const plantilla = (): InformeGenerado => ({ texto: informePlantilla(datos), origen: 'plantilla' });
  const proveedor = elegirProveedor(env, f);
  if (!proveedor) return plantilla();
  try {
    const clave = await hash(datos);
    const guardado = await cache?.get(clave).catch(() => null);
    if (guardado) return { texto: guardado, origen: 'ia' };

    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), TIEMPO_MAX_MS);
    let texto: string;
    try { texto = (await proveedor.generar(armarPrompt(datos), ctl.signal)).trim(); } finally { clearTimeout(timer); }
    if (texto.length < 80) throw new Error('Respuesta de IA demasiado corta');
    // El aviso de "no es una tasación" es obligatorio: si la IA no lo incluyó, lo agregamos nosotros.
    if (!texto.includes('no una tasación')) texto += '\n\n' + SITIO.avisoNoTasacion;
    await cache?.set(clave, texto).catch(() => {});
    return { texto, origen: 'ia' };
  } catch (e) {
    console.warn('IA no disponible, se usa la plantilla:', (e as Error).message);
    return plantilla();
  }
}

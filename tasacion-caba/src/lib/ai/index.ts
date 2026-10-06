// Capa intercambiable: cambiar de proveedor = cambiar AI_PROVIDER / AI_MODEL / AI_API_KEY.
// Regla: a la IA NUNCA se le mandan datos personales, solo inmueble + resultado del cálculo.
// Si falla o se pasa del cupo → informe de plantilla (plantilla.ts). Cachear por consulta.
import type { DatosInforme } from './tipos';
import { informePlantilla } from './plantilla';

export interface ProveedorIA { generar(prompt: string): Promise<string> }

export function elegirProveedor(_env: Record<string, string | undefined>): ProveedorIA | null {
  // TODO (Fase 4): switch sobre AI_PROVIDER → ./proveedores/{gemini,claude,openai}.ts
  return null;
}

export async function generarInforme(datos: DatosInforme, env: Record<string, string | undefined>): Promise<string> {
  const p = elegirProveedor(env);
  if (!p) return informePlantilla(datos);
  try { return await p.generar(/* TODO armar prompt */ ''); } catch { return informePlantilla(datos); }
}

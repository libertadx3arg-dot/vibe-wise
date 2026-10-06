// Solo datos del inmueble. Prohibido agregar nombre / teléfono / email acá.
import type { ResultadoValuacion } from '../valuacion/calculo.ts';

export interface DatosInforme { barrio: string; tipo: string; superficieTerreno: number | null; resultado: ResultadoValuacion }
export interface ProveedorIA { generar(prompt: string, señal?: AbortSignal): Promise<string> }
/** Caché de informes generados por IA (para no gastar cupo dos veces con la misma consulta). */
export interface CacheInformes { get(clave: string): Promise<string | null>; set(clave: string, informe: string): Promise<void> }
export interface InformeGenerado { texto: string; origen: 'ia' | 'plantilla' }

// Solo datos del inmueble. Prohibido agregar nombre / teléfono / email acá.
import type { ResultadoValuacion } from '../valuacion/calculo';
export interface DatosInforme { barrio: string; tipo: string; superficieTerreno: number | null; resultado: ResultadoValuacion }

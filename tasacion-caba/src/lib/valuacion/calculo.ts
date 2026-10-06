// ============================================================================
// CÁLCULO DEL PRECIO ESTIMADO DEL TERRENO
// El precio NO lo inventa la IA: sale de esta cuenta fija.
//
// Pasos:
//  1. m² construibles = superficie de parcela × edificabilidad (de Ciudad 3D / Código Urbanístico)
//  2. precio central  = m² construibles × incidencia del barrio (USD/m² construible)
//  3. rango           = precio central ± margen (config: SITIO.margenRango)
//  4. ajustes         = lote chico, frente angosto (explicados al usuario)
//  5. si es catalogado / protección patrimonial → NO se da precio
//  6. si el barrio está PENDIENTE → se dan m² construibles, el precio "te lo pasamos personalmente"
// ============================================================================

export interface DatosInmueble {
  barrio: string;
  superficieParcela: number | null;  // m², de catastro o cargado por el usuario
  frente: number | null;             // m
  edificabilidad: number | null;     // m² construibles por m² de parcela (PENDIENTE: definir según CUR)
  protegido: boolean;                // catalogado o APH
}

export type ResultadoValuacion =
  | { tipo: 'protegido'; motivo: string }
  | { tipo: 'sin_datos'; motivo: string }
  | { tipo: 'barrio_pendiente'; m2Construibles: number; ajustes: string[] }
  | { tipo: 'ok'; m2Construibles: number; minUsd: number; maxUsd: number; ajustes: string[] };

export function calcularValuacion(
  datos: DatosInmueble,
  incidenciaBarrio: number | null,
  margen: number,
): ResultadoValuacion {
  // TODO (Fase 3): implementar los pasos 1–6. Umbrales de "lote chico" y "frente angosto"
  // van como constantes comentadas acá arriba, marcadas PENDIENTE hasta que el corredor las valide.
  throw new Error('PENDIENTE: implementar en Fase 3');
}

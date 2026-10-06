// ============================================================================
// CÁLCULO DEL PRECIO ESTIMADO DEL TERRENO
// El precio NO lo inventa la IA: sale de esta cuenta fija.
//
// Pasos:
//  1. m² construibles = superficie del terreno × factor de edificabilidad del barrio
//     (m² que se pueden construir por cada m² de terreno; lo carga el corredor en la tabla de barrios).
//  2. precio central  = m² construibles × incidencia del barrio (USD por m² construible)
//  3. rango           = precio central ± margen (config: SITIO.margenRango)
//  4. ajustes         = lote chico (solo si el corredor definió umbral y descuento)
//  5. si el inmueble es catalogado / tiene protección patrimonial → NO se da precio
//  6. si falta algún valor del barrio (PENDIENTE) → no se inventa: "te lo pasamos personalmente"
// ============================================================================

export interface DatosInmueble {
  superficieTerreno: number | null; // m². null = "no sé"
  protegido: 'si' | 'no' | 'no_se';
}

export interface ValoresBarrio {
  incidenciaUsd: number | null;       // USD por m² construible. null = PENDIENTE
  factorEdificabilidad: number | null; // m² construibles por m² de terreno. null = PENDIENTE
}

export interface AjusteLoteChico { umbralM2: number | null; descuento: number | null }

export type ResultadoValuacion =
  | { tipo: 'protegido' }
  | { tipo: 'sin_superficie' }
  | { tipo: 'personalizado'; m2Construibles: number | null; verificarProteccion: boolean }
  | { tipo: 'ok'; m2Construibles: number; minUsd: number; maxUsd: number; ajustes: string[]; verificarProteccion: boolean };

const redondearMil = (n: number) => Math.round(n / 1000) * 1000;
const redondear10 = (n: number) => Math.round(n / 10) * 10;

export function calcularValuacion(
  datos: DatosInmueble,
  barrio: ValoresBarrio,
  margen: number,
  loteChico: AjusteLoteChico,
): ResultadoValuacion {
  // Paso 5: protegido → sin precio
  if (datos.protegido === 'si') return { tipo: 'protegido' };
  const verificarProteccion = datos.protegido === 'no_se';

  const sup = datos.superficieTerreno;
  if (sup === null || !(sup > 0)) return { tipo: 'sin_superficie' };

  // Paso 1
  const m2 = barrio.factorEdificabilidad !== null ? redondear10(sup * barrio.factorEdificabilidad) : null;

  // Paso 6
  if (m2 === null || barrio.incidenciaUsd === null) {
    return { tipo: 'personalizado', m2Construibles: m2, verificarProteccion };
  }

  // Paso 2
  let central = m2 * barrio.incidenciaUsd;

  // Paso 4
  const ajustes: string[] = [];
  if (loteChico.umbralM2 !== null && loteChico.descuento !== null && sup < loteChico.umbralM2) {
    central *= 1 - loteChico.descuento;
    ajustes.push(
      `Lote chico (menos de ${loteChico.umbralM2} m²): se descontó ${Math.round(loteChico.descuento * 100)} % porque a los desarrolladores les resulta menos atractivo.`,
    );
  }

  // Paso 3
  return {
    tipo: 'ok',
    m2Construibles: m2,
    minUsd: redondearMil(central * (1 - margen)),
    maxUsd: redondearMil(central * (1 + margen)),
    ajustes,
    verificarProteccion,
  };
}

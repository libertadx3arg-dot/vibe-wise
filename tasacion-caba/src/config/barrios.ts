// Semilla de la tabla de barrios. La fuente real es la tabla `barrios` en Supabase
// (editable desde el panel, Fase 6). null = PENDIENTE (no se muestra precio).
//  - incidenciaUsd: USD por m² construible
//  - factorEdificabilidad: m² construibles por cada m² de terreno
export interface BarrioConfig { nombre: string; incidenciaUsd: number | null; factorEdificabilidad: number | null }

const NOMBRES = [
  'Agronomía','Almagro','Balvanera','Barracas','Belgrano','Boedo','Caballito','Chacarita',
  'Coghlan','Colegiales','Constitución','Flores','Floresta','La Boca','La Paternal','Liniers',
  'Mataderos','Monte Castro','Montserrat','Nueva Pompeya','Núñez','Palermo','Parque Avellaneda',
  'Parque Chacabuco','Parque Chas','Parque Patricios','Puerto Madero','Recoleta','Retiro',
  'Saavedra','San Cristóbal','San Nicolás','San Telmo','Vélez Sarsfield','Versalles',
  'Villa Crespo','Villa del Parque','Villa Devoto','Villa General Mitre','Villa Lugano',
  'Villa Luro','Villa Ortúzar','Villa Pueyrredón','Villa Real','Villa Riachuelo',
  'Villa Santa Rita','Villa Soldati','Villa Urquiza',
];

export const BARRIOS_CABA: BarrioConfig[] = NOMBRES.map((nombre) => ({ nombre, incidenciaUsd: null, factorEdificabilidad: null }));

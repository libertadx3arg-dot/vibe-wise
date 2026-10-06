// Normalizador de direcciones USIG (GCBA) y datos de parcela.
// IMPORTANTE: verificar endpoints reales antes de usarlos (no inventar). Si no responden,
// usar lo que cargó el usuario.
export interface DireccionNormalizada { texto: string; barrio: string | null; esCaba: boolean; smp?: string; lat?: number; lng?: number }
export interface DatosParcela { superficie: number | null; frente: number | null; edificabilidad: number | null; protegido: boolean | null }

export async function autocompletar(_q: string): Promise<DireccionNormalizada[]> { throw new Error('PENDIENTE Fase 3'); }
export async function datosParcela(_smp: string): Promise<DatosParcela | null> { throw new Error('PENDIENTE Fase 3'); }

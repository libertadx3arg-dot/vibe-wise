// Datos editables del sitio. Todo lo marcado PENDIENTE lo confirma el corredor.
export const SITIO = {
  marca: 'Plano Base', // planobase.com.ar libre al 06/10/2026, PENDIENTE registrarlo (Fase 7)
  pie: 'Corredor responsable · CUCICBA 6990', // PENDIENTE de confirmar
  avisoNoTasacion:
    'Es una estimación orientativa, no una tasación. Para un valor firme hace falta una tasación de un corredor matriculado.',
  // Datos legales. PENDIENTE: completarlos antes de publicar (aparecen en privacidad y términos).
  titular: 'PENDIENTE (nombre o razón social)',
  domicilioLegal: 'PENDIENTE',
  emailContacto: 'PENDIENTE',
  margenRango: 0.15, // ±15 % sobre el precio central
  // Ajuste por lote chico. PENDIENTE: el corredor define el umbral y el descuento.
  // Mientras haya un null, el ajuste NO se aplica.
  ajusteLoteChico: { umbralM2: null as number | null, descuento: null as number | null }, // ej: { umbralM2: 150, descuento: 0.1 }
};

// Informe armado con texto fijo. Se usa siempre en la Fase 3 y como respaldo cuando falla la IA.
// Reglas: tono profesional, sin promesas, 3–5 párrafos simples.
import type { DatosInforme } from './tipos';
import { SITIO } from '../../config/sitio';

const usd = (n: number) => 'USD ' + n.toLocaleString('es-AR');

export function informePlantilla(d: DatosInforme): string {
  const r = d.resultado;
  const p: string[] = [];
  const lote = d.superficieTerreno ? ` de ${d.superficieTerreno} m²` : '';
  p.push(`Analizamos tu ${d.tipo.toLowerCase()}${lote} en ${d.barrio}, pensando en cuánto podría interesarle a un desarrollador inmobiliario. Los desarrolladores no pagan solo por el terreno: pagan por los metros que se pueden construir en él.`);

  if (r.tipo === 'protegido') {
    p.push('Nos indicaste que el inmueble está catalogado o en una zona de protección patrimonial. En esos casos las reglas de construcción cambian mucho y no corresponde dar un número sin analizar el caso.');
    p.push('Este inmueble tiene protección patrimonial, necesita una evaluación personalizada. Un asesor puede revisar la normativa que le aplica y explicarte las opciones.');
  } else if (r.tipo === 'sin_superficie') {
    p.push('Sin la superficie del terreno no podemos calcular los metros construibles ni el valor. Es un dato que figura en la escritura o en el plano de la propiedad.');
    p.push('Si lo conseguís, podés volver a consultar. Y si preferís, un asesor puede ayudarte a obtenerlo.');
  } else if (r.tipo === 'personalizado') {
    if (r.m2Construibles !== null) {
      p.push(`Con la normativa que usamos de referencia, en tu lote se podrían construir aproximadamente ${r.m2Construibles.toLocaleString('es-AR')} m².`);
    }
    p.push('Para tu barrio todavía no tenemos un valor de referencia cargado, así que no te damos un precio automático para no darte un número sin base. Te lo pasamos personalmente.');
  } else {
    p.push(`Con la normativa que usamos de referencia, en tu lote se podrían construir aproximadamente ${r.m2Construibles.toLocaleString('es-AR')} m².`);
    p.push(`Multiplicando esos metros por el valor de referencia de ${d.barrio} para desarrolladores, el rango estimado es de ${usd(r.minUsd)} a ${usd(r.maxUsd)}. Es un rango y no un número único porque el valor real depende de cada negociación.`);
    for (const a of r.ajustes) p.push(a);
  }

  if ('verificarProteccion' in r && r.verificarProteccion) {
    p.push('Como no sabías si el inmueble tiene protección patrimonial, conviene verificarlo: si la tuviera, el cálculo cambiaría.');
  }
  p.push(SITIO.avisoNoTasacion);
  return p.join('\n\n');
}

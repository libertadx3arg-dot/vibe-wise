// Correr con: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularValuacion } from './calculo.ts';

const sinAjuste = { umbralM2: null, descuento: null };
const barrio = { incidenciaUsd: 1000, factorEdificabilidad: 3 };

test('cuenta básica con rango ±15 %', () => {
  const r = calcularValuacion({ superficieTerreno: 200, protegido: 'no' }, barrio, 0.15, sinAjuste);
  assert.equal(r.tipo, 'ok');
  if (r.tipo !== 'ok') return;
  assert.equal(r.m2Construibles, 600);
  assert.equal(r.minUsd, 510000);
  assert.equal(r.maxUsd, 690000);
});

test('protegido: nunca da precio', () => {
  assert.equal(calcularValuacion({ superficieTerreno: 200, protegido: 'si' }, barrio, 0.15, sinAjuste).tipo, 'protegido');
});

test('sin superficie ("no sé")', () => {
  assert.equal(calcularValuacion({ superficieTerreno: null, protegido: 'no' }, barrio, 0.15, sinAjuste).tipo, 'sin_superficie');
});

test('barrio PENDIENTE: no inventa precio', () => {
  const r = calcularValuacion({ superficieTerreno: 200, protegido: 'no' }, { incidenciaUsd: null, factorEdificabilidad: 3 }, 0.15, sinAjuste);
  assert.deepEqual(r, { tipo: 'personalizado', m2Construibles: 600, verificarProteccion: false });
});

test('sin factor de edificabilidad: tampoco da m²', () => {
  const r = calcularValuacion({ superficieTerreno: 200, protegido: 'no_se' }, { incidenciaUsd: null, factorEdificabilidad: null }, 0.15, sinAjuste);
  assert.deepEqual(r, { tipo: 'personalizado', m2Construibles: null, verificarProteccion: true });
});

test('ajuste de lote chico solo si está configurado', () => {
  const r = calcularValuacion({ superficieTerreno: 100, protegido: 'no' }, barrio, 0, { umbralM2: 150, descuento: 0.1 });
  assert.equal(r.tipo, 'ok');
  if (r.tipo !== 'ok') return;
  assert.equal(r.minUsd, 270000);
  assert.equal(r.ajustes.length, 1);
});

// Correr con: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { coincide, listarCatalogo, marcarInteres, validarContacto, validarPerfil, COLUMNAS_CATALOGO } from './desarrolladores.ts';
import { aCsv, crearOportunidad, ponerOkDelDueno, ponerPublicada } from './admin.ts';
import { crearFalsoDb } from './falsodb.util.ts';

const perfilVacio = { barrios: [], m2_terreno_min: null, m2_terreno_max: null, m2_construibles_buscados: null, presupuesto_usd: null, tipo_proyecto: null };
const op = { id: 'o1', barrio: 'Palermo', m2_terreno: 300, m2_construibles: 900, min_usd: 800000, max_usd: 1000000 };

test('perfil vacío no marca coincidencias', () => assert.equal(coincide(perfilVacio, op), false));
test('coincide por barrio, tamaño y presupuesto', () => {
  assert.equal(coincide({ ...perfilVacio, barrios: ['Palermo'], m2_terreno_min: 200, m2_terreno_max: 400, presupuesto_usd: 900000 }, op), true);
  assert.equal(coincide({ ...perfilVacio, barrios: ['Belgrano'] }, op), false);
  assert.equal(coincide({ ...perfilVacio, m2_terreno_min: 400 }, op), false);
  assert.equal(coincide({ ...perfilVacio, m2_construibles_buscados: 1200 }, op), false);
  assert.equal(coincide({ ...perfilVacio, presupuesto_usd: 500000 }, op), false);
});
test('un dato faltante en la oportunidad no la descarta', () => {
  assert.equal(coincide({ ...perfilVacio, presupuesto_usd: 500000 }, { ...op, min_usd: null, max_usd: null }), true);
});
test('validaciones de registro', () => {
  assert.equal(validarContacto({ nombre: 'A', empresa: 'B', email: 'malo', whatsapp: '11 1234 5678' }).ok, false);
  assert.equal(validarContacto({ nombre: 'A', empresa: 'B', email: 'a@b.com', whatsapp: '123' }).ok, false);
  assert.equal(validarContacto({ nombre: 'A', empresa: 'B', email: 'a@b.com', whatsapp: '11 1234 5678', cuit: '123' }).ok, false);
  assert.equal(validarContacto({ nombre: 'A', empresa: 'B', email: 'A@B.com', whatsapp: '11 1234 5678', cuit: '30-12345678-9' }).ok, true);
  assert.equal(validarPerfil({ m2_terreno_min: 500, m2_terreno_max: 100 }, []).ok, false);
  const p = validarPerfil({ barrios: ['Palermo', 'Inventado', 'Palermo'], tipo_proyecto: 'raro' }, ['Palermo']);
  assert.ok(p.ok && p.datos.barrios.length === 1 && p.datos.tipo_proyecto === null);
});

test('SEGURIDAD: el catálogo solo pide columnas anónimas y solo publicadas', async () => {
  const db = crearFalsoDb({ oportunidades: [
    { id: 'a', propietario_id: 'SECRETO', barrio: 'Palermo', m2_terreno: 1, m2_construibles: 2, min_usd: 3, max_usd: 4, publicada: true },
    { id: 'b', propietario_id: 'SECRETO2', barrio: 'Belgrano', publicada: false },
  ] });
  const cat = await listarCatalogo(db, perfilVacio);
  assert.equal(cat.length, 1);
  assert.equal(cat[0].id, 'a');
  assert.ok(!JSON.stringify(cat).includes('SECRETO'));
  assert.ok(!('propietario_id' in cat[0]));
  assert.equal(db.log.selects.at(-1)?.cols, COLUMNAS_CATALOGO);
  for (const prohibido of ['propietario_id', 'direccion', 'nombre', 'email', 'whatsapp']) assert.ok(!COLUMNAS_CATALOGO.includes(prohibido), prohibido);
});

test('SEGURIDAD: "Me interesa" solo para aprobados y oportunidades publicadas', async () => {
  const db = crearFalsoDb({ oportunidades: [{ id: 'a', barrio: 'Palermo', publicada: true }, { id: 'b', barrio: 'X', publicada: false }] });
  assert.equal((await marcarInteres(db, { id: 'd1', estado: 'pendiente' }, 'a')).resultado, 'no_aprobado');
  assert.equal((await marcarInteres(db, { id: 'd1', estado: 'rechazado' }, 'a')).resultado, 'no_aprobado');
  assert.equal((await marcarInteres(db, { id: 'd1', estado: 'aprobado' }, 'b')).resultado, 'no_existe');
  assert.equal((await marcarInteres(db, { id: 'd1', estado: 'aprobado' }, 'zzz')).resultado, 'no_existe');
  assert.equal((await marcarInteres(db, { id: 'd1', estado: 'aprobado' }, 'a')).resultado, 'ok');
  assert.equal((await marcarInteres(db, { id: 'd1', estado: 'aprobado' }, 'a')).resultado, 'ya');
  assert.equal(db.tablas.intereses.length, 1);
});

test('admin: crear oportunidad desde un propietario', async () => {
  const db = crearFalsoDb({ propietarios: [
    { id: 'p1', barrio: 'Palermo', sup_terreno: 300, resultado: { tipo: 'ok', m2Construibles: 900, minUsd: 8e5, maxUsd: 1e6 } },
    { id: 'p2', barrio: 'Palermo', sup_terreno: 300, resultado: { tipo: 'protegido' } },
    { id: 'p3', barrio: 'Palermo', sup_terreno: 300, resultado: { tipo: 'personalizado', m2Construibles: 500 } },
  ] });
  assert.equal(await crearOportunidad(db, 'p1'), 'ok');
  assert.equal(await crearOportunidad(db, 'p1'), 'ya_existe');
  assert.equal(await crearOportunidad(db, 'p2'), 'sin_datos');
  assert.equal(await crearOportunidad(db, 'nope'), 'no_existe');
  assert.equal(await crearOportunidad(db, 'p3'), 'ok');
  const o = db.tablas.oportunidades;
  assert.equal(o[0].publicada ?? false, false);
  assert.equal(o[0].min_usd, 8e5);
  assert.equal(o[1].min_usd, null); // sin precio no se inventa
});
test('admin: no se publica sin el OK del dueño; retirar el OK despublica', async () => {
  const db = crearFalsoDb({ oportunidades: [{ id: 'a', ok_del_dueno: false, publicada: false }] });
  assert.equal(await ponerPublicada(db, 'a', true), 'falta_ok');
  assert.equal(db.tablas.oportunidades[0].publicada, false);
  await ponerOkDelDueno(db, 'a', true);
  assert.equal(await ponerPublicada(db, 'a', true), 'ok');
  await ponerOkDelDueno(db, 'a', false);
  assert.equal(db.tablas.oportunidades[0].publicada, false);
});
test('CSV: escapa comillas y neutraliza fórmulas', () => {
  const csv = aCsv([{ a: '=HYPERLINK("x")', b: 'dice "hola", chau', c: null, d: { x: 1 } }], ['a', 'b', 'c', 'd']);
  assert.ok(csv.includes(`"'=HYPERLINK(""x"")"`));
  assert.ok(csv.includes('"dice ""hola"", chau"'));
  assert.ok(csv.includes('"{""x"":1}"'));
});

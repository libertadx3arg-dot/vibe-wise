// Correr con: npm test  (usa respuestas simuladas: no llama a ningún servicio real)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generarInforme, elegirProveedor, armarPrompt } from './index.ts';
import { textoNuevoPropietario, avisarTelegram } from '../notificaciones/telegram.ts';
import type { DatosInforme } from './tipos.ts';

const datos: DatosInforme = {
  barrio: 'Palermo', tipo: 'Casa', superficieTerreno: 250,
  resultado: { tipo: 'ok', m2Construibles: 750, minUsd: 600000, maxUsd: 800000, ajustes: [], verificarProteccion: false },
};
const TEXTO = 'Un informe de prueba bastante largo para superar el mínimo de caracteres que exigimos a la IA, con varias palabras.';
const falso = (estado: number, cuerpo: unknown): typeof fetch =>
  (async () => new Response(JSON.stringify(cuerpo), { status: estado })) as any;

test('sin configurar usa la plantilla', async () => {
  const r = await generarInforme(datos, {});
  assert.equal(r.origen, 'plantilla');
});
test('AI_MODEL vacío o PENDIENTE no activa la IA', () => {
  assert.equal(elegirProveedor({ AI_PROVIDER: 'gemini', AI_API_KEY: 'x', AI_MODEL: 'PENDIENTE' }), null);
  assert.equal(elegirProveedor({ AI_PROVIDER: 'gemini', AI_API_KEY: 'x' }), null);
  assert.equal(elegirProveedor({ AI_PROVIDER: 'otro', AI_API_KEY: 'x', AI_MODEL: 'm' }), null);
});
test('Gemini, Claude y OpenAI: se cambia solo con variables', async () => {
  const casos: [string, unknown][] = [
    ['gemini', { candidates: [{ content: { parts: [{ text: TEXTO }] } }] }],
    ['claude', { content: [{ type: 'text', text: TEXTO }] }],
    ['openai', { choices: [{ message: { content: TEXTO } }] }],
  ];
  for (const [p, cuerpo] of casos) {
    const r = await generarInforme(datos, { AI_PROVIDER: p, AI_MODEL: 'm', AI_API_KEY: 'k' }, undefined, falso(200, cuerpo));
    assert.equal(r.origen, 'ia', p);
    assert.ok(r.texto.startsWith('Un informe de prueba'), p);
  }
});
test('si la IA falla (error 429) cae a la plantilla', async () => {
  const r = await generarInforme(datos, { AI_PROVIDER: 'gemini', AI_MODEL: 'm', AI_API_KEY: 'k' }, undefined, falso(429, {}));
  assert.equal(r.origen, 'plantilla');
});
test('si la IA tira una excepción de red cae a la plantilla', async () => {
  const roto = (async () => { throw new Error('sin red'); }) as any;
  const r = await generarInforme(datos, { AI_PROVIDER: 'claude', AI_MODEL: 'm', AI_API_KEY: 'k' }, undefined, roto);
  assert.equal(r.origen, 'plantilla');
});
test('agrega el aviso de no-tasación si la IA lo omite', async () => {
  const r = await generarInforme(datos, { AI_PROVIDER: 'openai', AI_MODEL: 'm', AI_API_KEY: 'k' }, undefined, falso(200, { choices: [{ message: { content: TEXTO } }] }));
  assert.ok(r.texto.includes('no una tasación'));
});
test('la caché evita llamar dos veces a la IA', async () => {
  const mem = new Map<string, string>();
  const cache = { get: async (k: string) => mem.get(k) ?? null, set: async (k: string, v: string) => { mem.set(k, v); } };
  let llamadas = 0;
  const contador = (async () => { llamadas++; return new Response(JSON.stringify({ choices: [{ message: { content: TEXTO } }] })); }) as any;
  const env = { AI_PROVIDER: 'openai', AI_MODEL: 'm', AI_API_KEY: 'k' };
  await generarInforme(datos, env, cache, contador);
  await generarInforme(datos, env, cache, contador);
  assert.equal(llamadas, 1);
});
test('la plantilla de respaldo NO se guarda en caché', async () => {
  const mem = new Map<string, string>();
  const cache = { get: async (k: string) => mem.get(k) ?? null, set: async (k: string, v: string) => { mem.set(k, v); } };
  await generarInforme(datos, { AI_PROVIDER: 'gemini', AI_MODEL: 'm', AI_API_KEY: 'k' }, cache, falso(500, {}));
  assert.equal(mem.size, 0);
});
test('el prompt a la IA no contiene datos personales', () => {
  const p = armarPrompt(datos);
  for (const prohibido of ['nombre', 'whatsapp', 'email', '@']) assert.ok(!p.toLowerCase().includes(`"${prohibido}"`), prohibido);
});
test('Telegram: sin claves no rompe; con claves manda el mensaje', async () => {
  assert.equal(await avisarTelegram({}, 'hola'), false);
  let url = '', cuerpo: any;
  const f = (async (u: string, o: any) => { url = u; cuerpo = JSON.parse(o.body); return new Response('{}'); }) as any;
  assert.equal(await avisarTelegram({ TELEGRAM_BOT_TOKEN: 'T', TELEGRAM_CHAT_ID: '123' }, 'hola', f), true);
  assert.ok(url.includes('/botT/sendMessage'));
  assert.equal(cuerpo.chat_id, '123');
});
test('Telegram: el texto de nuevo propietario no incluye datos personales y escapa HTML', () => {
  const t = textoNuevoPropietario({ PUBLIC_SITE_URL: 'https://x.com.ar' }, { barrio: 'Palermo <b>', tipo: 'Casa', supTerreno: 250, rango: 'USD 1', plazo: 'ya' });
  assert.ok(t.includes('Palermo &lt;b&gt;'));
  assert.ok(t.includes('https://x.com.ar/admin/propietarios'));
  assert.ok(!/whatsapp|email|nombre/i.test(t));
});

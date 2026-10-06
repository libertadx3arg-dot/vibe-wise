// Recibe el formulario del propietario, calcula, arma el informe y (si hay Supabase) guarda el contacto.
// Valida TODO en el servidor: lo que llega del navegador no es confiable.
import type { APIRoute } from 'astro';
import { getEnv } from '../../../lib/env';
import { SITIO } from '../../../config/sitio';
import { BARRIOS_CABA } from '../../../config/barrios';
import { calcularValuacion } from '../../../lib/valuacion/calculo';
import { generarInforme } from '../../../lib/ai';
import type { CacheInformes } from '../../../lib/ai/tipos';
import { avisarTelegram, textoNuevoPropietario } from '../../../lib/notificaciones/telegram';
import { clienteServidor } from '../../../lib/db/supabase';
import { limitePorIp, verificarTurnstile } from '../../../lib/seguridad/antispam';

const TIPOS = ['Casa', 'Terreno baldío', 'PH', 'Galpón', 'Otro'];
const ESTADOS = ['habitada', 'vacia', 'alquilada'];
const SINO = ['si', 'no', 'no_se'];
const PLAZOS = ['ya', '6_meses', '1_anio', 'solo_saber'];

const cacheMemoria = new Map<string, string>();
const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });

const texto = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const numero = (v: unknown) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 && n < 1_000_000 ? n : null;
};

export const POST: APIRoute = async ({ request, locals, clientAddress }) => {
  const env = getEnv(locals);
  let b: any;
  try { b = await request.json(); } catch { return json({ error: 'Datos inválidos.' }, 400); }

  if (!limitePorIp(clientAddress)) return json({ error: 'Hiciste muchas consultas seguidas. Probá de nuevo en un rato.' }, 429);
  if (!(await verificarTurnstile(b.turnstile, clientAddress, env.TURNSTILE_SECRET_KEY))) {
    return json({ error: 'No pudimos verificar que no sos un robot. Recargá la página e intentá de nuevo.' }, 400);
  }

  const nombre = texto(b.nombre, 100);
  const whatsapp = texto(b.whatsapp, 30);
  const email = texto(b.email, 150);
  const direccion = texto(b.direccion, 200);
  const barrioNombre = texto(b.barrio, 60);
  const tipo = texto(b.tipo, 30);
  const protegido = texto(b.protegido, 10);
  if (b.consentimiento !== true) return json({ error: 'Necesitamos tu consentimiento para continuar.' }, 400);
  if (!nombre || whatsapp.replace(/\D/g, '').length < 8 || !/^\S+@\S+\.\S+$/.test(email)) return json({ error: 'Revisá tu nombre, WhatsApp y email.' }, 400);
  if (!direccion) return json({ error: 'Falta la dirección.' }, 400);
  const barrio = BARRIOS_CABA.find((x) => x.nombre === barrioNombre);
  if (!barrio) return json({ error: 'Por ahora solo cubrimos CABA.' }, 400);
  if (!TIPOS.includes(tipo) || !SINO.includes(protegido)) return json({ error: 'Datos inválidos.' }, 400);

  const supTerreno = numero(b.supTerreno);
  const supConstruida = numero(b.supConstruida);
  const estadoInmueble = ESTADOS.includes(b.estadoInmueble) ? b.estadoInmueble : null;
  const masDuenos = SINO.includes(b.masDuenos) ? b.masDuenos : 'no_se';
  const sucesion = SINO.includes(b.sucesion) ? b.sucesion : 'no_se';
  const plazo = PLAZOS.includes(b.plazo) ? b.plazo : null;

  const db = clienteServidor(env);

  // Valores del barrio: de la base si hay, si no la semilla (todo PENDIENTE).
  let valores = { incidenciaUsd: barrio.incidenciaUsd, factorEdificabilidad: barrio.factorEdificabilidad };
  if (db) {
    const { data } = await db.from('barrios').select('incidencia_usd,factor_edificabilidad').eq('nombre', barrio.nombre).maybeSingle();
    if (data) valores = { incidenciaUsd: data.incidencia_usd, factorEdificabilidad: data.factor_edificabilidad };
  }

  const resultado = calcularValuacion({ superficieTerreno: supTerreno, protegido: protegido as any }, valores, SITIO.margenRango, SITIO.ajusteLoteChico);
  // Caché de informes de IA: en la base si hay, si no en memoria.
  const cache: CacheInformes = db
    ? {
        get: async (k) => (await db.from('informes_cache').select('informe').eq('hash', k).maybeSingle()).data?.informe ?? null,
        set: async (k, informe) => { await db.from('informes_cache').upsert({ hash: k, informe }); },
      }
    : {
        get: async (k) => cacheMemoria.get(k) ?? null,
        set: async (k, v) => { cacheMemoria.set(k, v); },
      };
  // A la IA / plantilla solo van datos del inmueble, nunca nombre, teléfono ni email.
  const { texto: informe } = await generarInforme({ barrio: barrio.nombre, tipo, superficieTerreno: supTerreno, resultado }, env, cache);

  if (db) {
    const { error } = await db.from('propietarios').insert({
      nombre, whatsapp, email, consentimiento: true, direccion, barrio: barrio.nombre, tipo,
      sup_terreno: supTerreno, sup_construida: supConstruida, protegido, estado_inmueble: estadoInmueble,
      mas_duenos: masDuenos, sucesion, plazo, resultado, informe,
    });
    if (error) console.error('No se pudo guardar la consulta:', error.message);
  } else {
    console.warn('[modo prueba] Supabase sin configurar: la consulta NO se guardó.');
  }

  // Aviso a Telegram (sin nombre, teléfono ni email). Si falla, la consulta igual sigue.
  const rango = resultado.tipo === 'ok'
    ? `USD ${resultado.minUsd.toLocaleString('es-AR')} – ${resultado.maxUsd.toLocaleString('es-AR')}`
    : resultado.tipo === 'protegido' ? 'Protegido (sin precio)' : resultado.tipo === 'sin_superficie' ? 'Sin superficie (sin precio)' : 'Barrio PENDIENTE (sin precio)';
  await avisarTelegram(env, textoNuevoPropietario(env, { barrio: barrio.nombre, tipo, supTerreno, rango, plazo }));

  const wa = (env.PUBLIC_WHATSAPP_NUMERO ?? '').replace(/\D/g, '');
  const mensaje = `Hola, consulté la estimación de mi ${tipo.toLowerCase()} en ${barrio.nombre} y quiero hablar con un asesor.`;
  return json({ resultado, informe, whatsappUrl: wa ? `https://wa.me/${wa}?text=${encodeURIComponent(mensaje)}` : null });
};

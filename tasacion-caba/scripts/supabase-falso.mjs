// SUPABASE FALSO PARA PRUEBAS LOCALES. No es seguro ni real: sirve para probar y mostrar la web sin crear cuentas.
// Imita lo mínimo de Supabase (login por token y tablas) y trae DATOS DE DEMOSTRACIÓN inventados.
// Uso:  node scripts/supabase-falso.mjs      (escucha en http://localhost:54321)
// Tokens de prueba (cookie "pb_at"):  admintoken → admin@test.com   ·   devtoken → desarrollador aprobado   ·   devpendtoken → desarrollador pendiente
import http from 'node:http';

const PK = { barrios: ['nombre'], informes_cache: ['hash'], intereses: ['oportunidad_id', 'desarrollador_id'] };
const T = {
  barrios: [{ nombre: 'Palermo', incidencia_usd: 1000, factor_edificabilidad: 3 }, { nombre: 'Belgrano', incidencia_usd: null, factor_edificabilidad: null }, { nombre: 'Almagro', incidencia_usd: null, factor_edificabilidad: null }],
  propietarios: [
    { id: 'p1', creado_en: '2026-10-01T12:00:00Z', nombre: 'DEMO María Pérez', whatsapp: '11 5555 0001', email: 'dueno@test.com', direccion: 'Calle Demo 123', barrio: 'Palermo', tipo: 'Casa', sup_terreno: 300, sup_construida: 150, protegido: 'no', estado_inmueble: 'habitada', mas_duenos: 'no', sucesion: 'no', plazo: '6_meses', estado: 'nuevo', notas: null, informe: 'Informe de demostración.\n\nEs una estimación orientativa, no una tasación. Para un valor firme hace falta una tasación de un corredor matriculado.', resultado: { tipo: 'ok', m2Construibles: 900, minUsd: 765000, maxUsd: 1035000, ajustes: [], verificarProteccion: false } },
    { id: 'p2', creado_en: '2026-10-02T12:00:00Z', nombre: 'DEMO Juan Gómez', whatsapp: '11 5555 0002', email: 'otro@test.com', direccion: 'Calle Secreta 999', barrio: 'Belgrano', tipo: 'PH', sup_terreno: 120, sup_construida: null, protegido: 'no_se', estado_inmueble: 'vacia', mas_duenos: 'si', sucesion: 'no_se', plazo: 'solo_saber', estado: 'contactado', notas: 'Llamar el lunes', informe: 'Informe demo 2', resultado: { tipo: 'personalizado', m2Construibles: null, verificarProteccion: true } },
  ],
  desarrolladores: [
    { id: 'd1', creado_en: '2026-10-01T10:00:00Z', email: 'dev@test.com', nombre: 'DEMO Ana Torres', empresa: 'DEMO Constructora Uno', whatsapp: '11 4444 0001', cuit: '30123456789', barrios: ['Palermo'], m2_terreno_min: 200, m2_terreno_max: 500, m2_construibles_buscados: 600, presupuesto_usd: 1200000, tipo_proyecto: 'vivienda', estado: 'aprobado' },
    { id: 'd2', creado_en: '2026-10-03T10:00:00Z', email: 'devpend@test.com', nombre: 'DEMO Luis Ríos', empresa: 'DEMO Desarrollos Dos', whatsapp: '11 4444 0002', cuit: null, barrios: [], m2_terreno_min: null, m2_terreno_max: null, m2_construibles_buscados: null, presupuesto_usd: null, tipo_proyecto: null, estado: 'pendiente' },
  ],
  oportunidades: [
    { id: 'o1', creado_en: '2026-10-02T10:00:00Z', propietario_id: 'p1', barrio: 'Palermo', m2_terreno: 300, m2_construibles: 900, min_usd: 765000, max_usd: 1035000, ok_del_dueno: true, publicada: true },
    { id: 'o2', creado_en: '2026-10-03T10:00:00Z', propietario_id: 'p2', barrio: 'Belgrano', m2_terreno: 120, m2_construibles: null, min_usd: null, max_usd: null, ok_del_dueno: false, publicada: false },
  ],
  intereses: [], informes_cache: [],
};
const USUARIOS = { admintoken: { id: 'ua', email: 'admin@test.com' }, devtoken: { id: 'ud1', email: 'dev@test.com' }, devpendtoken: { id: 'ud2', email: 'devpend@test.com' } };
let seq = 100;

function filtrar(filas, params) {
  let r = filas;
  for (const [k, v] of params) {
    if (['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'].includes(k)) continue;
    if (k === 'or') { const conds = v.slice(1, -1).split(','); r = r.filter((f) => conds.some((c) => { const [col, op, val] = c.split('.'); return op === 'is' && val === 'null' ? f[col] == null : false; })); continue; }
    const [op, ...rest] = v.split('.'); const val = rest.join('.');
    if (op === 'eq') r = r.filter((f) => String(f[k]) === val);
    else if (op === 'in') { const lista = val.slice(1, -1).split(',').map((x) => x.replace(/^"|"$/g, '')); r = r.filter((f) => lista.includes(String(f[k]))); }
    else if (op === 'is') r = r.filter((f) => (val === 'null' ? f[k] == null : String(f[k]) === val));
    else if (op === 'ilike') r = r.filter((f) => String(f[k]).toLowerCase() === val.toLowerCase());
  }
  return r;
}
const proyectar = (r, sel) => (!sel || sel === '*' ? r : Object.fromEntries(sel.split(',').map((c) => c.trim()).map((c) => [c, r[c]])));

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  let body = ''; for await (const c of req) body += c;
  const send = (s, o, h = {}) => { res.writeHead(s, { 'content-type': 'application/json', ...h }); res.end(o === undefined ? '' : JSON.stringify(o)); };
  const auth = (req.headers.authorization || '').replace('Bearer ', '');
  if (u.pathname === '/auth/v1/user') { const us = USUARIOS[auth]; return us ? send(200, { ...us, aud: 'authenticated' }) : send(401, { msg: 'invalid token' }); }
  if (u.pathname === '/auth/v1/otp') { console.log('[falso] link mágico pedido para', JSON.parse(body || '{}').email); return send(200, {}); }
  if (u.pathname === '/auth/v1/token') return send(400, { error: 'invalid_grant' });
  const m = u.pathname.match(/^\/rest\/v1\/(\w+)$/);
  if (!m || !T[m[1]]) return send(404, { message: 'no existe' });
  // La clave de servicio la usa el servidor de la web. La clave pública (anon) NO puede leer nada (imita RLS sin políticas).
  if (auth !== 'clave-de-servicio-falsa') return send(401, { code: '42501', message: 'permission denied' });
  const nombre = m[1], filas = T[nombre];
  const params = [...u.searchParams.entries()];
  const sel = u.searchParams.get('select');
  if (req.method === 'GET' || req.method === 'HEAD') {
    let r = filtrar(filas, params);
    const orden = u.searchParams.get('order');
    if (orden) { const [c, d] = orden.split('.'); r = [...r].sort((a, b) => (String(a[c]) < String(b[c]) ? -1 : 1) * (d === 'desc' ? -1 : 1)); }
    const total = r.length;
    if (u.searchParams.get('limit')) r = r.slice(0, +u.searchParams.get('limit'));
    const h = { 'content-range': `0-${Math.max(total - 1, 0)}/${total}` };
    if (req.method === 'HEAD') { res.writeHead(200, h); return res.end(); }
    const out = r.map((x) => proyectar(x, sel));
    if ((req.headers.accept || '').includes('vnd.pgrst.object')) return out.length === 1 ? send(200, out[0], h) : send(406, { message: 'JSON object requested, multiple (or no) rows returned' });
    return send(200, out, h);
  }
  if (req.method === 'POST') {
    const upsert = (req.headers.prefer || '').includes('merge-duplicates');
    const items = [].concat(JSON.parse(body));
    const pk = PK[nombre] || ['id'];
    for (const it of items) {
      const ex = filas.find((f) => pk.every((k) => it[k] !== undefined && f[k] === it[k]));
      const dupEmail = nombre === 'desarrolladores' && filas.some((f) => f.email === it.email);
      if ((ex || dupEmail) && !upsert) return send(409, { code: '23505', message: 'duplicate key value' });
      if (ex) Object.assign(ex, it); else filas.push({ ...(pk[0] === 'id' ? { id: 'n' + ++seq, creado_en: new Date().toISOString() } : {}), ...it });
    }
    return send(201, (req.headers.prefer || '').includes('representation') ? items : undefined);
  }
  if (req.method === 'PATCH') { const r = filtrar(filas, params); r.forEach((f) => Object.assign(f, JSON.parse(body))); return send(200, (req.headers.prefer || '').includes('representation') ? r.map((x) => proyectar(x, sel)) : undefined); }
  if (req.method === 'DELETE') { filtrar(filas, params).forEach((f) => filas.splice(filas.indexOf(f), 1)); return send(204); }
  send(405, { message: 'no soportado' });
}).listen(54321, () => console.log('Supabase FALSO escuchando en http://localhost:54321 (solo pruebas)'));

// Pruebas de seguridad contra la web y la base de datos. Uso (desde la carpeta tasacion-caba):
//
//   SITE_URL=https://tu-sitio.pages.dev \
//   PUBLIC_SUPABASE_URL=https://xxxx.supabase.co PUBLIC_SUPABASE_ANON_KEY=eyJ... \
//   node scripts/probar-seguridad.mjs
//
// Opcional (avanzado): DEV_ACCESS_TOKEN = token de un desarrollador APROBADO ya logueado, para probar también
// que un desarrollador no pueda entrar al panel ni ver datos de dueños.
// En Windows (cmd) las variables se definen con:  set SITE_URL=http://localhost:4321   (una línea por variable)
const SITE = (process.env.SITE_URL || 'http://localhost:4321').replace(/\/$/, '');
const SB = process.env.PUBLIC_SUPABASE_URL, ANON = process.env.PUBLIC_SUPABASE_ANON_KEY, DEV = process.env.DEV_ACCESS_TOKEN;
let fallas = 0, saltadas = 0;
const ok = (c, t, extra = '') => { console.log(`${c ? '✅' : '❌'} ${t}${!c && extra ? '  → ' + extra : ''}`); if (!c) fallas++; };
const saltar = (t) => { console.log(`⏭️  ${t}`); saltadas++; };
const pedir = (ruta, o = {}) => fetch(SITE + ruta, { redirect: 'manual', ...o, headers: { origin: SITE, ...(o.headers || {}) } });
const json = { 'content-type': 'application/json' };

console.log(`\n== Web: ${SITE} ==`);
for (const ruta of ['/admin', '/admin/propietarios', '/admin/desarrolladores', '/admin/oportunidades', '/admin/barrios']) {
  const r = await pedir(ruta); ok(r.status === 302 && (r.headers.get('location') || '').startsWith('/acceso'), `Sin sesión, ${ruta} redirige al login`, `status ${r.status}`);
}
for (const [m, ruta] of [['GET', '/api/admin/exportar-csv?tabla=propietarios'], ['POST', '/api/admin/barrios'], ['POST', '/api/admin/desarrollador'], ['POST', '/api/admin/oportunidad'], ['POST', '/api/admin/propietario']]) {
  const r = await pedir(ruta, { method: m, headers: json, body: m === 'POST' ? '{}' : undefined }); ok(r.status === 401, `Sin sesión, ${m} ${ruta} da 401`, `status ${r.status}`);
}
for (const ruta of ['/desarrollador/catalogo', '/desarrollador/perfil', '/propietario/mis-informes']) {
  const r = await pedir(ruta); ok(r.status === 302 && (r.headers.get('location') || '').startsWith('/acceso'), `Sin sesión, ${ruta} redirige al login`, `status ${r.status}`);
}
{ const r = await pedir('/api/desarrollador/me-interesa', { method: 'POST', headers: json, body: '{"oportunidadId":"x"}' }); ok(r.status === 401, 'Sin sesión, "Me interesa" da 401', `status ${r.status}`); }
{ const r = await pedir('/api/admin/barrios', { method: 'POST', headers: { ...json, origin: 'https://sitio-malo.example' }, body: '{}' }); ok(r.status === 403, 'Un pedido de escritura desde otro sitio se bloquea (403)', `status ${r.status}`); }
{ const r = await pedir('/'); ok(r.headers.get('x-frame-options') === 'DENY' && r.headers.get('x-content-type-options') === 'nosniff', 'Cabeceras de seguridad presentes'); }
{ const r = await pedir('/api/auth/enviar-link', { method: 'POST', headers: json, body: JSON.stringify({ email: 'nadie-existe-xyz@ejemplo.com', rol: 'desarrollador' }) });
  ok([200, 503].includes(r.status), 'Pedir un link con un email que no existe no revela nada (200 genérico)', `status ${r.status}`); }

console.log('\n== Base de datos (con la clave pública, como lo haría un atacante) ==');
if (!SB || !ANON) saltar('Faltan PUBLIC_SUPABASE_URL y PUBLIC_SUPABASE_ANON_KEY: no se probó la base');
else for (const t of ['propietarios', 'desarrolladores', 'oportunidades', 'intereses', 'barrios', 'informes_cache']) {
  const r = await fetch(`${SB}/rest/v1/${t}?select=*&limit=5`, { headers: { apikey: ANON, authorization: `Bearer ${ANON}` } });
  const cuerpo = await r.text(); let filas = -1; try { filas = JSON.parse(cuerpo).length; } catch {}
  ok(r.status === 401 || r.status === 403 || filas === 0, `La clave pública NO puede leer "${t}"`, `status ${r.status}, ${filas} filas`);
}

console.log('\n== Como desarrollador logueado ==');
if (!DEV) saltar('Sin DEV_ACCESS_TOKEN: no se probó la sesión de desarrollador (opcional)');
else {
  const c = { cookie: `pb_at=${DEV}` };
  let r = await pedir('/admin', { headers: c }); ok(r.status === 302, 'Un desarrollador NO entra al panel /admin', `status ${r.status}`);
  r = await pedir('/api/admin/exportar-csv?tabla=propietarios', { headers: c }); ok(r.status === 403, 'Un desarrollador NO puede exportar propietarios', `status ${r.status}`);
  r = await pedir('/api/admin/barrios', { method: 'POST', headers: { ...json, ...c }, body: '{}' }); ok(r.status === 403, 'Un desarrollador NO puede editar valores de barrios', `status ${r.status}`);
  r = await pedir('/desarrollador/catalogo', { headers: c }); const html = await r.text();
  ok(r.status === 200, 'Un desarrollador entra al catálogo', `status ${r.status}`);
  ok(!/propietario_id|wa\.me|mailto:|direccion/i.test(html), 'El catálogo no contiene dirección, contacto ni ids de propietarios');
}
console.log(`\n${fallas ? '❌ ' + fallas + ' prueba(s) fallaron' : '✅ Todo bien'}${saltadas ? ` (${saltadas} saltada(s))` : ''}`);
process.exit(fallas ? 1 : 0);

// MODO DEMO: levanta la web con un Supabase FALSO y datos inventados, sin crear ninguna cuenta.
// Uso:  npm run demo   →  abrí http://localhost:4321/demo
// Es solo para mirar y probar en tu compu. No guarda nada real ni envía emails.
import { spawn } from 'node:child_process';
import { existsSync, renameSync, writeFileSync, rmSync } from 'node:fs';

const shell = process.platform === 'win32';
const VARS = {
  DEMO_MODE: '1', PUBLIC_SUPABASE_URL: 'http://localhost:54321', PUBLIC_SUPABASE_ANON_KEY: 'clave-publica-falsa',
  SUPABASE_SERVICE_ROLE_KEY: 'clave-de-servicio-falsa', ADMIN_EMAIL: 'admin@test.com', PUBLIC_SITE_URL: 'http://localhost:4321',
};
// El servidor de desarrollo lee las variables de .dev.vars. Si tenías un .dev.vars propio, se guarda y se restaura al salir.
const respaldo = existsSync('.dev.vars') ? '.dev.vars.respaldo-demo' : null;
if (respaldo) renameSync('.dev.vars', respaldo);
writeFileSync('.dev.vars', Object.entries(VARS).map(([k, v]) => `${k}=${v}`).join('\n') + '\n');

const falso = spawn(process.execPath, ['scripts/supabase-falso.mjs'], { stdio: 'inherit' });
const web = spawn('npx', ['astro', 'dev', '--port', '4321'], { stdio: 'inherit', shell, env: { ...process.env, ...VARS } });

let saliendo = false;
function salir() {
  if (saliendo) return; saliendo = true;
  falso.kill(); web.kill();
  // Astro puede dejar el servidor corriendo en segundo plano: se lo apaga explícitamente.
  const parar = spawn('npx', ['astro', 'dev', 'stop'], { stdio: 'ignore', shell });
  parar.on('exit', limpiar); setTimeout(limpiar, 8000).unref();
}
function limpiar() {
  rmSync('.dev.vars', { force: true });
  if (respaldo && existsSync(respaldo)) renameSync(respaldo, '.dev.vars');
  process.exit(0);
}
process.on('SIGINT', salir); process.on('SIGTERM', salir);
console.log('\n👉 Abrí http://localhost:4321/demo   (Ctrl + C para apagar)\n');

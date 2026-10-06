// MODO DEMO: levanta la web con un Supabase FALSO y datos inventados, sin crear ninguna cuenta.
// Uso:  npm run demo   →  abrí http://localhost:4321/demo
// Es solo para mirar y probar en tu compu. No guarda nada real ni envía emails.
import { spawn } from 'node:child_process';
const hijos = [];
const lanzar = (cmd, args, env = {}) => {
  const h = spawn(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32', env: { ...process.env, ...env } });
  hijos.push(h); return h;
};
lanzar(process.execPath, ['scripts/supabase-falso.mjs']);
lanzar('npx', ['astro', 'dev', '--port', '4321'], {
  DEMO_MODE: '1', PUBLIC_SUPABASE_URL: 'http://localhost:54321', PUBLIC_SUPABASE_ANON_KEY: 'clave-publica-falsa',
  SUPABASE_SERVICE_ROLE_KEY: 'clave-de-servicio-falsa', ADMIN_EMAIL: 'admin@test.com', PUBLIC_SITE_URL: 'http://localhost:4321',
});
const salir = () => { hijos.forEach((h) => h.kill()); process.exit(0); };
process.on('SIGINT', salir); process.on('SIGTERM', salir);
console.log('\n👉 Abrí http://localhost:4321/demo   (Ctrl + C para apagar)\n');

// Chequeo de salud. Una consulta liviana a la base evita que Supabase (plan gratis) pause el proyecto por inactividad.
// Se llama una vez por día desde una tarea programada (ver docs/MANTENER-SUPABASE.md). No devuelve datos.
import type { APIRoute } from 'astro';
import { getEnv } from '../../lib/env';
import { clienteServidor } from '../../lib/db/supabase';

export const GET: APIRoute = async ({ locals }) => {
  const db = clienteServidor(getEnv(locals));
  let base = 'sin_configurar';
  if (db) { const { error } = await db.from('barrios').select('nombre').limit(1); base = error ? 'error' : 'ok'; }
  return new Response(JSON.stringify({ web: 'ok', base }), { status: base === 'error' ? 503 : 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
};

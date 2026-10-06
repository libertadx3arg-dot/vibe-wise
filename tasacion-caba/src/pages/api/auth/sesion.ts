// Recibe los tokens del link mágico, los verifica con Supabase y arma la sesión (cookies httpOnly).
import type { APIRoute } from 'astro';
import { getEnv } from '../../../lib/env';
import { clienteServidor } from '../../../lib/db/supabase';
import { guardarSesion } from '../../../lib/auth/sesion';

export const POST: APIRoute = async ({ request, locals, cookies }) => {
  const env = getEnv(locals);
  const db = clienteServidor(env);
  let b: any; try { b = await request.json(); } catch { b = {}; }
  const at = typeof b.access_token === 'string' ? b.access_token : '';
  const rt = typeof b.refresh_token === 'string' ? b.refresh_token : undefined;
  if (!db || !at) return new Response(JSON.stringify({ error: 'Link inválido.' }), { status: 400 });
  const { data, error } = await db.auth.getUser(at);
  if (error || !data.user?.email) return new Response(JSON.stringify({ error: 'El link venció o ya se usó. Pedí uno nuevo.' }), { status: 401 });
  guardarSesion(cookies, env, at, rt, Number(b.expires_in) || 3600);
  return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
};

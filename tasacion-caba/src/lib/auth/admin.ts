// Defensa en profundidad: además del middleware, cada endpoint del panel vuelve a comprobar que sea el administrador.
import { getEnv } from '../env';
import { clienteServidor } from '../db/supabase';
import { esAdmin } from './sesion';

const json = (o: unknown, s: number) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json' } });

export function exigirAdmin(locals: any): { db: any } | Response {
  const env = getEnv(locals);
  if (!esAdmin(locals.usuario ?? null, env)) return json({ error: 'No autorizado' }, 403);
  const db = clienteServidor(env);
  return db ? { db } : json({ error: 'Base de datos sin configurar' }, 503);
}
export const respuestaJson = json;

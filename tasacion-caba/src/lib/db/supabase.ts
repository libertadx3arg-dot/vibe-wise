// Cliente Supabase solo para el servidor (usa la clave de servicio: NUNCA mandarla al navegador).
// Si no hay claves cargadas devuelve null y la web sigue andando en "modo prueba" (no guarda nada).
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export function clienteServidor(env: Record<string, string | undefined>): SupabaseClient | null {
  const url = env.PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Cliente con la clave pública. Solo se usa para pedir el envío del link mágico por email. */
export function clienteAnon(env: Record<string, string | undefined>): SupabaseClient | null {
  const url = env.PUBLIC_SUPABASE_URL;
  const key = env.PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, flowType: 'implicit' } });
}

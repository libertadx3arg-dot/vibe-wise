// Lee variables de entorno: en Cloudflare (secretos y variables del panel) y en tu compu (.env).
import { env as cloudflare } from 'cloudflare:workers';

export function getEnv(_locals?: unknown): Record<string, string | undefined> {
  return { ...(import.meta.env as Record<string, string | undefined>), ...(cloudflare as unknown as Record<string, string | undefined>) };
}

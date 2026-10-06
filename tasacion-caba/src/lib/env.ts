// Lee variables de entorno tanto en Cloudflare (producción) como en tu compu (.env).
export function getEnv(locals?: any): Record<string, string | undefined> {
  const cf = locals?.runtime?.env ?? {};
  return { ...(import.meta.env as Record<string, string | undefined>), ...cf };
}

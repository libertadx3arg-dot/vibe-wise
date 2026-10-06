export const prerender = true;
import type { APIRoute } from 'astro';
import { BARRIOS_CABA } from '../config/barrios';
import { slugBarrio } from '../lib/barrios-url';

export const GET: APIRoute = ({ site }) => {
  const base = (site ?? new URL('https://planobase.com.ar')).origin;
  const rutas = ['/', '/propietario', '/desarrollador', '/terreno', '/privacidad', '/terminos', ...BARRIOS_CABA.map((b) => `/terreno/${slugBarrio(b.nombre)}`)];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rutas.map((r) => `  <url><loc>${base}${r}</loc></url>`).join('\n')}\n</urlset>\n`;
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
};

import type { APIRoute } from 'astro';
import { cerrarSesion } from '../../../lib/auth/sesion';
export const POST: APIRoute = async ({ cookies }) => { cerrarSesion(cookies); return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } }); };

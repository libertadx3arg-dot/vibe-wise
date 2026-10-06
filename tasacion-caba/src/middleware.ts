// Middleware: proteger /admin (solo ADMIN_EMAIL) y /desarrollador/catalogo (solo aprobados). TODO Fase 5-6
import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware((_context, next) => next());

# Guía para quien continúe (Sonnet)

El brief completo está en `docs/BRIEF.md`. Leelo entero antes de tocar código.
Esta carpeta ya tiene la **estructura**; tu trabajo es completarla fase por fase.

## Reglas con el usuario (no negociables)
- Español rioplatense, corto, sin jerga. Una pregunta por vez, con 2–3 opciones y recomendación.
- Frenar al final de cada fase, mostrar cómo probar, esperar OK.
- No gastar plata. No inventar datos (precios, endpoints, normativa) → `PENDIENTE`.
- Sin promesas en los textos.

## Stack elegido
- **Astro** (páginas rápidas, buen SEO) en **Cloudflare Pages/Workers** (gratis, permite uso comercial).
- **Supabase**: base de datos + login con link mágico. El plan gratis pausa tras ~1 semana sin uso →
  armar un Cron Trigger de Cloudflare que haga una consulta diaria (avisar al usuario).
- **Cloudflare Turnstile** + límite por IP para anti-spam.
- **Gemini** (AI Studio, gratis) detrás de `src/lib/ai/` intercambiable.
- **Telegram** para avisos.

## Mapa
| Ruta | Qué es | Fase |
|---|---|---|
| `src/config/sitio.ts` | marca, pie (CUCICBA), aviso, margen | 2 |
| `src/config/barrios.ts` | 48 barrios, semilla (todos PENDIENTE) | 3 |
| `src/lib/valuacion/calculo.ts` | **toda** la cuenta del precio, comentada en castellano | 3 |
| `src/lib/catastro/usig.ts` | USIG + datos parcela. **Verificar endpoints reales** | 3 |
| `src/lib/ai/` | capa IA + plantilla fallback + caché | 3–4 |
| `src/lib/notificaciones/telegram.ts` | avisos | 4 |
| `src/lib/seguridad/antispam.ts` | Turnstile + rate limit | 3 |
| `src/pages/propietario/*` | recorrido propietario | 3 |
| `src/pages/desarrollador/*` | registro, perfil, catálogo anónimo | 5 |
| `src/pages/admin/*` | panel | 6 |
| `src/pages/api/*` | endpoints servidor | 3–6 |
| `src/middleware.ts` | protección de rutas | 5–6 |
| `supabase/migrations/` | esquema + RLS | 2, 7 |

## Pendiente de Fase 1 (decide el usuario)
- 3 nombres de marca + chequeo de `.com.ar` en nic.ar (no comprar).
- Lista de cuentas gratis a crear: Cloudflare, Supabase, Google AI Studio, Telegram (@BotFather).

## Fase 7 – seguridad
Probar con un usuario desarrollador real que no pueda leer `propietarios`, `desarrolladores` ajenos
ni `oportunidades.propietario_id`. Dejar el test escrito.

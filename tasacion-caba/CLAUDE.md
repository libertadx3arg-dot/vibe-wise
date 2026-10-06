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
- Marca elegida: **Plano Base** (planobase.com.ar libre al 06/10/2026; registrarlo en nic.ar antes de publicar, cuesta plata: avisar).
- Lista de cuentas gratis a crear: Cloudflare, Supabase, Google AI Studio, Telegram (@BotFather).

## Fase 7 – seguridad
Probar con un usuario desarrollador real que no pueda leer `propietarios`, `desarrolladores` ajenos
ni `oportunidades.propietario_id`. Dejar el test escrito.

## Estado de la Fase 3 (hecha, falta OK del usuario)
- Recorrido del propietario en `src/pages/propietario/index.astro` (8 pasos, resultado en la misma pantalla).
- `POST /api/propietario/consulta`: valida, calcula, arma informe de plantilla, guarda en Supabase **si hay claves** (si no, "modo prueba": no guarda).
- Cuenta del precio en `src/lib/valuacion/calculo.ts` con tests (`npm test`).
- Se agregó la pregunta "¿está protegida?" (catalogado/APH) porque el catastro no se pudo consultar.
- **PENDIENTE (no inventar):** `incidenciaUsd` y `factorEdificabilidad` de cada barrio (`src/config/barrios.ts` / tabla `barrios`),
  umbral y descuento de lote chico (`SITIO.ajusteLoteChico`). Hasta que el corredor los cargue, el resultado dice "te lo pasamos personalmente".
- **PENDIENTE:** autocompletado USIG y datos de parcela. El entorno bloqueó `servicios.usig.buenosaires.gob.ar` (403 de la red del sandbox),
  así que no se verificó ningún endpoint. Hoy el usuario escribe la dirección y elige el barrio de una lista.
- **PENDIENTE:** el aviso por Telegram de "nuevo propietario" es de la Fase 4. Límite por IP en memoria (débil): endurecer en Fase 7.

## Estado de la Fase 4 (hecha, falta probar con claves reales)
- `src/lib/ai/`: Gemini / Claude / OpenAI por `AI_PROVIDER`, `AI_MODEL`, `AI_API_KEY`. Sin las tres, o con `AI_MODEL` vacío, usa la plantilla.
  Timeout 12 s, caché por hash de los datos del inmueble (tabla `informes_cache`; en memoria si no hay Supabase). La plantilla de respaldo no se cachea.
- `src/lib/notificaciones/telegram.ts`: avisos de nuevo propietario (ya conectado en `/api/propietario/consulta`),
  y textos listos para nuevo desarrollador y "Me interesa" (se conectan en la Fase 5).
- `npm test`: 17 tests con respuestas simuladas. **Nunca se llamó a Gemini ni a Telegram de verdad** (el sandbox no tiene salida a esos hosts): falta la prueba real con las claves del usuario.
- No se inventó ningún nombre de modelo: `AI_MODEL` lo carga el usuario según su cuenta de AI Studio.

## Estado de las Fases 5, 6 y 7 (hechas; falta probar con Supabase REAL)
- **Seguridad por diseño:** todas las tablas con RLS y sin políticas + `revoke` a anon/authenticated. Solo el servidor (clave de servicio)
  toca la base y filtra columnas. Catálogo = `COLUMNAS_CATALOGO` fija (`src/lib/negocio/desarrolladores.ts`). Nunca agregar columnas de dueño.
- **Login:** link mágico (implicit flow). `/api/auth/enviar-link` (respuesta genérica), `/auth/callback` → `/api/auth/sesion` (cookies httpOnly `pb_at`/`pb_rt`).
  Rol = email verificado: admin = `ADMIN_EMAIL`; desarrollador = fila en `desarrolladores`; propietario = filas en `propietarios` (email en minúscula, comparación exacta).
- `src/middleware.ts`: bloquea escrituras con `Origin` ajeno (CSRF), protege `/admin` y `/api/admin`, pone cabeceras de seguridad y CSP (solo en producción).
  Cada endpoint admin vuelve a verificar con `exigirAdmin`.
- Lógica de negocio testeada en `src/lib/negocio/` con una base falsa en memoria (`falsodb.util.ts`). `npm test` = 26 tests.
- `scripts/supabase-falso.mjs` + `scripts/demo.mjs` (`npm run demo`): Supabase FALSO local con datos inventados para recorrer todo sin cuentas. `/demo` solo existe con `DEMO_MODE=1`.
- `scripts/probar-seguridad.mjs` (`npm run seguridad`): pruebas contra la web y la clave pública. **Contra el falso solo valida el script; la prueba real de RLS requiere el Supabase verdadero.**
- En el sandbox, para probar contra el falso hay que lanzar Astro SIN las variables de proxy (`env -u HTTP_PROXY -u http_proxy -u HTTPS_PROXY -u https_proxy ...`), porque el proxy bloquea `localhost`.
- Guías para el usuario: `docs/VER-EN-MI-COMPU.md`, `docs/GUIA-PANEL.md`, `docs/PUBLICAR.md`, `docs/MANTENER-SUPABASE.md`.
- **Nunca probado de verdad:** envío real de emails de Supabase, Turnstile, Gemini, Telegram, y el despliegue en Cloudflare (sin cuentas ni salida de red en el sandbox).
- **PENDIENTE del usuario:** valores por barrio, revisión legal, datos legales en `sitio.ts`, WhatsApp, dominio.

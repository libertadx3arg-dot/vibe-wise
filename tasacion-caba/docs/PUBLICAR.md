# Cómo publicar Plano Base (todo gratis)

> Los nombres de los menús de cada servicio pueden cambiar. Si algo no coincide, la documentación oficial de cada uno manda.
> **Antes de gastar plata** (por ejemplo el dominio `.com.ar`), avisame y lo confirmamos.

## 0. Antes de publicar: pendientes tuyos
- [ ] Cargar los valores de cada barrio (panel → Barrios). Sin eso, nadie ve precio.
- [ ] Que un abogado revise **Privacidad** y **Términos** (están marcados `[REVISAR]`).
- [ ] Completar `titular`, `domicilioLegal` y `emailContacto` en `src/config/sitio.ts`, y confirmar la matrícula del pie.
- [ ] Decidir si se registra la base de datos ante la Agencia de Acceso a la Información Pública (lo define el abogado).
- [ ] Tener el número de WhatsApp del asesor (`PUBLIC_WHATSAPP_NUMERO`).

## 1. Cuentas gratis que necesitás
| Servicio | Para qué | Dirección |
|---|---|---|
| Supabase | base de datos y login por email | https://supabase.com |
| Cloudflare | publicar la web + anti-spam (Turnstile) | https://dash.cloudflare.com |
| Google AI Studio | la IA Gemini (opcional) | https://aistudio.google.com |
| Telegram (@BotFather) | avisos al celular | en la app de Telegram |

## 2. Supabase
1. Creá un proyecto nuevo.
2. Menú **SQL Editor** → pegá **todo** el contenido de `supabase/migrations/0001_esquema.sql` → *Run*. Crea las tablas, deja el acceso directo cerrado y carga los 48 barrios en PENDIENTE.
3. En **Project Settings → API** copiá: la *URL*, la clave *anon / public* y la clave *service_role*.
   - La `service_role` es **secreta**: no va en el código ni se comparte. Solo en las variables de Cloudflare.
4. En **Authentication → URL Configuration**: *Site URL* = la dirección de tu web; en *Redirect URLs* agregá `https://TU-DOMINIO/auth/callback`.
5. **Ojo con los emails:** el envío de emails que trae Supabase por defecto tiene un límite muy bajo y está pensado para pruebas. Para uso real conviene configurar un servicio de envío propio (SMTP) en Authentication → SMTP. Hay servicios con plan gratis; verificá sus límites actuales.
6. Para que Supabase no se pause por inactividad, seguí `docs/MANTENER-SUPABASE.md`.

## 3. Cloudflare Pages
1. Subí el proyecto a un repositorio de GitHub (puede ser este).
2. En Cloudflare: **Workers & Pages → Create → Pages → Connect to Git** y elegí el repositorio.
3. Configuración de compilación:
   - *Root directory*: `tasacion-caba` (si el proyecto está dentro de otra carpeta)
   - *Build command*: `npm run build`
   - *Build output directory*: `dist`
   - Variable `NODE_VERSION` = `22`
4. En **Settings → Variables and secrets** cargá las del archivo `.env.example`:
   - Marcá como **secreto**: `SUPABASE_SERVICE_ROLE_KEY`, `AI_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TURNSTILE_SECRET_KEY`.
   - `PUBLIC_SITE_URL` = la dirección final de tu web. `ADMIN_EMAIL` = tu email.
   - **No** cargues `DEMO_MODE` jamás.
5. **Turnstile** (anti-spam): en el panel de Cloudflare creá un *widget*, copiá la *site key* a `PUBLIC_TURNSTILE_SITE_KEY` y la *secret key* a `TURNSTILE_SECRET_KEY`.
6. La compilación puede mostrar un aviso sobre un "SESSION binding" y otro sobre "sharp": no los usamos, se pueden ignorar.

## 4. Dominio
Cuando decidas registrar `planobase.com.ar` en https://nic.ar (tiene costo), te acompaño para apuntarlo a Cloudflare Pages.

## 5. Probar la seguridad (obligatorio antes de abrirlo)
Desde la carpeta `tasacion-caba`, con tu sitio ya publicado:

    set SITE_URL=https://TU-SITIO
    set PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
    set PUBLIC_SUPABASE_ANON_KEY=la-clave-anon
    npm run seguridad

(En Mac/Linux usá `export` en vez de `set`.) Tiene que terminar en **✅ Todo bien**. Prueba, entre otras cosas, que la clave pública **no pueda leer** ninguna tabla, que sin sesión no se entre al panel, y que un pedido desde otro sitio se bloquee.

### Prueba manual con un desarrollador real
1. Registrá un desarrollador de prueba con otro email y aprobalo desde el panel.
2. Entrá con ese email al catálogo: tiene que mostrar solo barrio, m² y rango. Ni dirección ni nombre del dueño.
3. Con ese mismo usuario probá abrir `/admin`: te tiene que mandar al login.
4. Mirá que `.env` **no** esté en GitHub y que la clave `service_role` no aparezca en ningún archivo del repositorio.

## 6. Después de publicar
- Mirá un par de consultas reales en el panel y en Telegram.
- Revisá en Supabase (plan gratis) el uso de la base de vez en cuando.

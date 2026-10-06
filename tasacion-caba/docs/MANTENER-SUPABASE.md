# Que Supabase no se pause por inactividad

El plan gratis de Supabase **pausa el proyecto si pasa más o menos una semana sin uso**. Para evitarlo, la web tiene un chequeo liviano en `/api/salud` que hace una consulta mínima a la base (no devuelve datos).

Solo hace falta que algo lo visite una vez por día. Dos opciones gratis:

## Opción A: GitHub Actions (recomendada)
1. Poné el proyecto en su propio repositorio de GitHub.
2. Copiá el archivo `docs/mantener-supabase.yml` a `.github/workflows/mantener-supabase.yml`.
3. En GitHub: Settings → Secrets and variables → Actions → "New repository secret": nombre `SITE_URL`, valor la dirección de tu web (por ejemplo `https://planobase.com.ar`).

## Opción B: un monitor gratuito de disponibilidad
Servicios como UptimeRobot (plan gratis) pueden visitar `https://tu-sitio/api/salud` cada pocos minutos. Verificá los límites del plan gratis al momento de contratarlo.

Si el proyecto llegara a pausarse, se reactiva a mano desde el panel de Supabase.

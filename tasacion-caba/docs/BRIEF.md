# Prompt para Claude Code — Web de valuación de terrenos en CABA

> Copiá todo lo que está debajo de la línea y pegalo en Claude Code, dentro de una carpeta vacía.

---

## Quién soy y cómo quiero que trabajes

Soy corredor inmobiliario. Trabajo con Century 21 Cosentino (corredor responsable: Gabriel, matrícula CUCICBA 6990). Quiero captar dueños de casas y terrenos en CABA que podrían vender a desarrolladores, y conectar esos terrenos con desarrolladores.

No soy programador. Reglas para trabajar conmigo:

1. Hablame en español rioplatense, corto y claro. Sin jerga técnica; si tenés que usar un término, explicalo en una línea.
2. Una pregunta por vez. Si necesitás decidir algo, dame 2 o 3 opciones y decime cuál recomendás.
3. Trabajá por fases (abajo). Al final de cada fase frená, mostrame qué hiciste y cómo probarlo, y esperá mi OK.
4. **No gastes plata.** Todo con planes gratuitos. Si algo cuesta (aunque sea poco, como un dominio), avisame el costo y esperá que diga que sí.
5. **No inventes datos.** Ni precios por barrio, ni endpoints de APIs, ni normativa. Si no estás seguro, verificalo o dejalo marcado como `PENDIENTE`.
6. **Nada de promesas** en los textos de la web: no "vendé en 30 días", no "el mejor precio garantizado". Tono profesional y honesto.
7. Antes de instalar algo o crear una cuenta en un servicio, decime qué es y para qué.

## Qué es la web

Una web donde:

- **Propietarios** de casas o terrenos en CABA consultan cuánto podría valer su terreno para un desarrollador. Reciben un **rango de precio estimado** y un informe corto. Después pueden avanzar para vender conmigo.
- **Desarrolladores** dicen qué terrenos buscan y ven un catálogo de oportunidades anónimas.

La página de inicio tiene dos botones grandes: **"Soy propietario"** y **"Soy desarrollador"**. Cada uno lleva a su propio recorrido.

## Marca

Marca propia nueva (no usa la marca Century 21). Proponeme **3 nombres** cortos, fáciles de decir y en español, y fijate si el dominio `.com.ar` está libre (podés chequearlo, pero no lo compres). Yo elijo.

En el pie de todas las páginas: `Corredor responsable · CUCICBA 6990`. Dejalo en un archivo de configuración, porque todavía lo tengo que confirmar.

## Recorrido del propietario

1. **Dirección**: campo con autocompletado de direcciones de CABA (usar el normalizador de direcciones del Gobierno de la Ciudad, USIG, que es gratis). Si la dirección no es de CABA, avisar amablemente que por ahora solo cubrimos CABA.
2. **Preguntas simples**, de a una o dos por pantalla, con barra de progreso:
   - Tipo: casa / terreno baldío / PH / galpón / otro.
   - Superficie del terreno (m²) y superficie construida (m²), con opción "no sé".
   - Estado: habitada, vacía, alquilada.
   - ¿Hay más dueños? ¿Sucesión en curso? (sí / no / no sé).
   - ¿En cuánto tiempo pensás vender? (ya / 6 meses / 1 año / solo quiero saber).
3. **Datos de contacto**: nombre, WhatsApp y email, con casilla obligatoria de consentimiento (Ley 25.326 de datos personales) y link a la política de privacidad.
4. **Resultado** (recién después de dejar los datos):
   - Rango en USD (mínimo – máximo), nunca un número único.
   - Cuántos m² se podrían construir en el lote, aproximadamente.
   - Informe corto escrito por la IA (3–5 párrafos simples).
   - Aviso visible: *"Es una estimación orientativa, no una tasación. Para un valor firme hace falta una tasación de un corredor matriculado."*
   - Botón "Quiero hablar con un asesor" que abre WhatsApp con un mensaje ya escrito.
5. **Login opcional** con link mágico por email (sin contraseña) para volver a ver su informe.

## Recorrido del desarrollador

1. Registro: nombre, empresa, email, WhatsApp, CUIT (opcional). Login con link mágico.
2. **Perfil de búsqueda**: barrios, m² de terreno mínimos y máximos, m² construibles buscados, presupuesto, tipo de proyecto (vivienda, oficinas, mixto).
3. Queda en estado **"pendiente de aprobación"**. Yo lo apruebo desde el panel.
4. Ya aprobado, ve un **catálogo de oportunidades anónimas**: barrio, m² de terreno, m² construibles estimados, rango de precio. **Nunca** ve la dirección exacta, ni el nombre, ni los datos del dueño.
5. Botón **"Me interesa"** en cada oportunidad, que me avisa a mí.
6. Cuando entra un terreno que coincide con su perfil, ve una marca de "coincide con tu búsqueda".

Una oportunidad solo aparece en el catálogo si yo la publico a mano desde el panel (y después de que el dueño me haya dado su OK).

## Panel de administración (solo yo)

- Lista de propietarios con sus datos, estimación, estado (nuevo / contactado / en proceso / descartado) y notas.
- Lista de desarrolladores para aprobar o rechazar.
- Publicar o despublicar oportunidades en el catálogo, con una vista previa de lo que va a ver el desarrollador.
- Ver quién marcó "Me interesa" en cada oportunidad.
- **Editar la tabla de valores por barrio** sin tocar código.
- Ver qué proveedor de IA está activo.
- Exportar todo a CSV.

## Cómo se calcula el precio (importante)

El precio **no lo inventa la IA**. Lo calcula una cuenta fija, y la IA solo redacta el informe.

1. Con la dirección, buscar la parcela y sus datos urbanísticos en las fuentes públicas de la Ciudad (catastro, Ciudad 3D / Código Urbanístico: superficie de la parcela, altura o edificabilidad permitida, si es catalogada o está en zona de protección patrimonial). **Verificá qué endpoints existen y funcionan antes de usarlos; no los inventes.** Si alguno no responde, usar lo que cargó el usuario.
2. Calcular m² construibles aproximados.
3. Precio = m² construibles × valor de incidencia del barrio (USD por m² construible), con un rango (por ejemplo ±15 %, configurable).
4. Ajustes simples y explicados: lote muy chico, frente angosto, inmueble catalogado o protegido (en ese caso **no** dar precio: mostrar "este inmueble tiene protección patrimonial, necesita una evaluación personalizada").
5. La tabla de valores por barrio arranca con todos los barrios de CABA en `PENDIENTE`. Si un barrio está en `PENDIENTE`, se muestran los m² construibles pero el precio dice "te lo pasamos personalmente", y me llega igual el aviso.

Dejá toda la lógica de cálculo en un solo archivo bien comentado, en castellano, para que yo pueda entenderla.

## La IA

- Arrancar con **Gemini** (Google AI Studio), plan gratuito.
- Hacé una capa intermedia para que cambiar de proveedor (Gemini, Claude, OpenAI, otro) sea solo cambiar una variable de configuración (`AI_PROVIDER`, `AI_MODEL`, `AI_API_KEY`), sin tocar el resto del código.
- A la IA **nunca le mandes datos personales** (nombre, teléfono, email): solo datos del inmueble y el resultado del cálculo. En el plan gratis, Google puede usar lo que se le manda.
- Si la IA falla o se pasa del límite gratis, mostrar un informe armado con plantilla fija. La web nunca se rompe por la IA.
- Guardar en caché el informe de cada consulta para no gastar cupo dos veces.

## Avisos por Telegram

Cada vez que pasa algo importante, me llega un mensaje a mi Telegram:

- Nuevo propietario (con barrio, tipo, m², rango, plazo, y link al panel).
- Nuevo desarrollador para aprobar.
- Un desarrollador marcó "Me interesa".

Explicame paso a paso cómo crear el bot con @BotFather y conseguir mi chat ID. El token va en variables de entorno, nunca en el código.

## Tecnología (todo gratis)

Proponé vos la combinación, con estas condiciones:

- Plan gratuito que **permita uso comercial** (ojo: el plan Hobby de Vercel no lo permite; considerá Cloudflare o Netlify).
- Base de datos + login gratis (por ejemplo Supabase). Si el plan gratis pausa el proyecto por inactividad, avisame y armá algo simple para evitarlo.
- Protección anti-spam gratis en los formularios (por ejemplo Cloudflare Turnstile + límite de consultas por IP).
- Que se vea muy bien en el celular (la mayoría va a entrar desde ahí).
- Rápida, simple y con buen SEO local ("cuánto vale mi terreno en Palermo", etc.).

## Legales

- Página de política de privacidad y términos (borrador; marcá lo que tiene que revisar un abogado).
- El aviso de "no es una tasación" en el resultado y en el informe.
- No mostrar ninguna marca de terceros (ni Century 21) sin que yo lo confirme.

## Fases

Frená al final de cada una y esperá mi OK:

1. **Plan**: 3 nombres de marca, tecnología elegida, qué cuentas gratis voy a tener que crear, y un mapa de pantallas. Sin código todavía.
2. **Base**: proyecto creado, página de inicio con los dos botones, diseño general y pie con la matrícula. Que lo pueda ver en mi compu.
3. **Propietario**: recorrido completo con cálculo, tabla de barrios en `PENDIENTE` e informe con plantilla fija (todavía sin IA).
4. **IA + Telegram**: conectar Gemini con la capa intercambiable y los avisos.
5. **Desarrollador**: registro, perfil, aprobación y catálogo anónimo.
6. **Panel admin**: todo lo de arriba, incluida la edición de la tabla de barrios.
7. **Publicar**: subirlo gratis, checklist de seguridad (que un desarrollador no pueda ver datos de dueños ni de otros desarrolladores; probalo) y una guía corta en castellano de cómo uso el panel.

Empezá por la Fase 1. Antes, si te falta algo, preguntame (de a una pregunta).

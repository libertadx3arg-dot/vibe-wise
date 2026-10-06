# Guía del panel de administración

El panel es **solo para vos**. Lo ves en `https://tu-sitio/admin`.

## Cómo entrar
1. Andá a `/acceso?rol=admin` (o a `/admin`: te lleva solo).
2. Escribí tu email (el mismo que cargaste como `ADMIN_EMAIL`).
3. Te llega un link por email. Tocalo y listo: no hay contraseña. El link sirve una vez.
4. Para salir, botón **Salir** arriba a la derecha.

Si no te llega el email, mirá el spam. Cualquier otro email que no sea el tuyo no recibe nada.

## Qué hacés cada día
1. **Resumen**: mirá cuántos propietarios nuevos y desarrolladores por aprobar hay. También te dice qué IA está activa y si faltan cuentas por configurar.
2. **Propietarios**: cada tarjeta es una consulta. Ves sus datos, la estimación que recibió y su plazo de venta. Tocá el WhatsApp para escribirle.
   - Cambiá el **estado** (nuevo → contactado → en proceso → descartado) y escribí **notas**. Tocá *Guardar*.
   - *Crear oportunidad* prepara el terreno para el catálogo de desarrolladores (no lo publica todavía). No se puede crear si el inmueble está protegido o si no hay m² construibles.
3. **Desarrolladores**: aprobá o rechazá. Hasta que no aprobás, no ven nada.
4. **Oportunidades**: acá publicás.
   - Primero tildá **"El dueño dio su OK"** (solo cuando el dueño te autorizó de verdad). Sin eso, el sistema no deja publicar.
   - Después **Publicar**. Mirá la **vista previa**: es exactamente lo que ve el desarrollador (sin dirección ni datos del dueño).
   - **Despublicar** la saca del catálogo. Si quitás el OK del dueño, se despublica sola.
   - Abajo ves quién marcó **"Me interesa"**, con sus datos de contacto.
5. **Barrios**: la tabla de valores (ver abajo).

## La tabla de barrios
Por cada barrio cargás dos números:
- **Incidencia (USD por m² construible):** cuánto paga un desarrollador por cada m² que puede construir.
- **Factor de edificabilidad:** cuántos m² se pueden construir por cada m² de terreno. Ejemplo: factor 3 → un lote de 200 m² permite construir 600 m².

Mientras un barrio tenga un campo vacío, está **PENDIENTE**: a los propietarios de ese barrio se les muestra "te lo pasamos personalmente" (sin precio) y a vos igual te llega el aviso. **Estos números los define tu criterio profesional: el sistema no inventa ninguno.**

Cómo se usa: precio estimado = (superficie del terreno × factor) × incidencia, con un margen de ±15 % (rango).

## Exportar
En **Resumen**, al final, descargás un CSV (se abre en Excel) de propietarios, desarrolladores, oportunidades o "Me interesa".

## Avisos por Telegram
Te llega un mensaje cuando hay un propietario nuevo, un desarrollador para aprobar o un "Me interesa".

# Cómo ver Plano Base en tu compu

Necesitás **Node.js** (versión 20 o más nueva): https://nodejs.org (botón "LTS").

## Preparar (una sola vez)
1. Bajá el proyecto y abrí una terminal **dentro de la carpeta `tasacion-caba`**.
   Tip en Windows: en el Explorador, entrá a la carpeta, hacé clic en la barra de direcciones, escribí `cmd` y apretá Enter.
2. Escribí: `npm install`

## Opción 1: modo demo (recomendada para mirar todo)
Muestra la web **completa con datos inventados**, incluido el panel de administración y el catálogo de desarrolladores. No necesita ninguna cuenta ni guarda nada real.

    npm run demo

Abrí http://localhost:4321/demo y elegí cómo entrar (administrador, desarrollador aprobado o pendiente).
Para apagar: `Ctrl + C`.

## Opción 2: solo la web pública
    npm run dev

Abrí http://localhost:4321. Sin cuentas conectadas, las consultas no se guardan y no hay panel.

## Tips
- Para verlo como en un celular: `F12` en Chrome o Edge y el ícono de celular/tablet.
- La barra oscura que aparece abajo es de desarrollo; en la web publicada no está.
- Para correr las pruebas automáticas: `npm test`.

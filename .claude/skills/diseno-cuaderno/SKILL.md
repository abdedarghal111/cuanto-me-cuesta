---
name: diseno-cuaderno
description: Sistema de diseño «cuaderno de taller + terminal» de «Cuánto me cuesta»: tipografías, colores, piezas, iconos y diálogos. Úsala siempre que vayas a tocar App.svelte, cualquier componente .svelte, app.css o los textos de la interfaz, o a crear una pantalla nueva.
---

# Diseño: cuaderno de taller + terminal

Un cuaderno cuadriculado de taller con la claridad de un terminal. La cuadrícula es el fondo y todo lo que se lee va sobre papel blanco. Los estilos están en `src/app.css` (tokens y utilidades) y en las clases de Tailwind de los componentes.

## Tipografías

Locales, en `src/res/fonts/`.

- `font-hand` (Caveat): títulos, cabeceras de bloque y totales grandes.
- `font-notebook` (Kalam): texto normal.
- `font-mono` (IBM Plex Mono): números, importes, cabeceras de tabla y rutas.

## Colores

- Tinta `#1B2733`.
- Azul `#1F4FA8` para los enlaces.
- Rojo `#B42318` para borrar y para «sin guardar».
- Amarillo pósit `#FFF4A8`.
- Cada categoría tiene su color `--c1…--c10` según el orden de las plantillas, con fondo claro mediante `softColor()`.

## Piezas

- `paper` para todo lo que se lee; `paper-soft` para textos sueltos.
- `note-card` para la cifra importante.
- Ranking con barras de bloques en el color de cada categoría para comparar importes.
- Tablas con filas alternas bien distinguibles; los números con `numeric` y el campo que más se cambia con `highlighted`.
- `editable-title` para los títulos que se editan en el sitio.
- Botones: `button-yellow` para la acción principal, `button-soft` (azul) para las secundarias y `button-soft-danger` (rojo) para borrar. Las acciones son siempre botones, nunca enlaces.
- Para añadir filas o elementos, un hueco fantasma («Escribe aquí para añadir…», «Nueva sección…») en lugar de un botón.
- Las pantallas nuevas se construyen con estas mismas piezas.

## Reglas

- Legibilidad primero: contraste alto y todo visible de un vistazo.
- Tema claro, colores planos y sombras duras.
- Lenguaje llano en primera persona.
- En escritorio, el contenido cabe a lo ancho; la tabla se desplaza de lado solo en pantallas estrechas.
- Los iconos son SVG de trazo de `src/components/Icon.svelte`, donde se añaden los que falten. Los botones que solo llevan icono tienen `aria-label`.
- Los diálogos se hacen con `src/components/Dialog.svelte`. Los diálogos nativos del sistema quedan para los archivos: abrir, guardar como, guardar los cambios al cerrar, y recuperar tras un cierre inesperado.
- Los avisos que esperan una decisión sin bloquear la app, como un archivo cambiado fuera, son una notificación encima de la hoja: papel blanco con raya azul gruesa a la izquierda, un icono en un círculo azul claro, una frase sencilla y tranquila y sus botones (utilidades `notice` y `notice-icon`; p. ej. `OutsideChangeNotice.svelte` y `UpdateNotice.svelte`).

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
- Cada categoría tiene su color `--c1…--c10` según el orden de la plantilla, con fondo claro mediante `softColor()`.

## Piezas

- `paper` para todo lo que se lee; `paper-soft` para textos sueltos.
- `note-card` para la cifra importante.
- Ranking con barras de bloques en el color de cada categoría para comparar importes.
- Tablas con filas alternas bien distinguibles; los números con `numeric` y el campo que más se cambia con `highlighted`.
- `editable-title` para los títulos que se editan en el sitio y `link` para las acciones secundarias.
- Las pantallas nuevas se construyen con estas mismas piezas.

## Reglas

- Legibilidad primero: contraste alto y todo visible de un vistazo.
- Tema claro, colores planos y sombras duras.
- Lenguaje llano en primera persona.
- En escritorio, el contenido cabe a lo ancho; la tabla se desplaza de lado solo en pantallas estrechas.
- Los iconos son SVG de trazo de `src/components/Icon.svelte`, donde se añaden los que falten. Los botones que solo llevan icono tienen `aria-label`.
- Los diálogos se hacen con `src/components/Dialog.svelte`. Lo único que avisa el navegador es el cierre con cambios sin guardar.

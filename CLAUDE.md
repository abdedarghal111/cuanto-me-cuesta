# Cuánto me cuesta

App local para apuntar lo que cuesta cada cosa que hago y ver en qué se va el dinero.

- Svelte 5 (runes) + TypeScript + Tailwind 4 + Vite. Una sola app: `main.client.ts` la monta y lleva la URL, y `main.server.ts` conecta los endpoints al servidor de Vite (`connect`), montado como plugin.
- Organización de `src/`, por funcionalidad:
  - `routes/<ruta>/`: una carpeta por URL, solo con su vista (`Product.svelte`) y sus llamadas al servidor (`product.server.ts`) y desde el navegador (`product.client.ts`). La portada «Todo» (`/`) es `routes/home/Home.svelte`; `App.svelte` monta la barra, el diálogo y la vista de la URL.
  - `components/`: el resto de piezas `.svelte`.
  - `model/`: las clases de una hoja de costes, que hacen sus cuentas y se leen y escriben como `.txt`; en `model/text/`, el lector y las piezas del texto.
  - `store.client.svelte.ts`: el estado de la app; `colors.ts`, `app.css` y `res/`.
- Abrir: `npm run abrir`. Comprobar: `npm run check`.
- Interfaz en español de España, con coma decimal.
- Los datos se guardan en `.txt` para que una persona o una IA los pueda leer y editar con facilidad, y así se pueda automatizar sin problemas. Por eso cada archivo es redundante a propósito: lleva costes, subtotales, resumen e instrucciones que la app recalcula o ignora al leer.
- Prioridad absoluta a la sencillez y al mantenimiento cero: usa solo las dependencias que ya tiene el proyecto.
- Revisa los cambios razonando sobre el código; prueba en el navegador solo cuando te lo pida.
- Las decisiones que son mías, pregúntamelas; las demás, toma la más simple y dímelo.
- Los archivos se modifican solo con las herramientas de edición (Edit y Write), para que yo vea cada cambio.
- Para los `.txt` y la plantilla, usa la skill `formato-datos`; para la interfaz, `diseno-cuaderno`.

## Reglas del código

- Código sencillo y mantenible: lo mínimo que resuelva el problema.
- Todo `if`, `else`, `for` y `while` lleva llaves.
- Indentación de 4 espacios.
- Todo el código vive en `src/`, y el nombre de cada archivo dice dónde se ejecuta:
  - `.server.ts`: solo en Node, dentro del servidor de Vite (p. ej. `main.server.ts` y `product.server.ts`, que usa `node:fs`).
  - `.client.ts` (o `.client.svelte.ts` si usa runes): solo en el navegador (p. ej. `main.client.ts`, `product.client.ts`, `store.client.svelte.ts`).
  - Sin sufijo: de uso general, sirve en los dos lados porque no depende ni de Node ni del navegador (p. ej. `model/`, `colors.ts`). Un archivo así no importa nunca uno `.server` ni `.client`.
  - Los componentes `.svelte` son de navegador por naturaleza y no llevan sufijo.
- Las importaciones relativas llevan la extensión del archivo (`.ts`, `.svelte.ts`, `.svelte`), como pide el cargador nativo de configuración de Vite.
- Comentarios en español, formales, cortos, sobre lo que hace el código, y con el estándar de documentación oficial del lenguaje en funciones y tipos.
- Cada archivo empieza con un comentario formal que describe su función, según el estándar de documentación oficial del lenguaje.
- La lógica de los datos vive en el modelo (`model/`), y los componentes y el store la llaman:
  - Lo que trabaja con un objeto concreto es un método de su clase (p. ej. `section.subtotal()`).
  - Lo que no depende de ningún objeto es un método estático (p. ej. `Summary.combine()`).

## Interfaz

- Cada vista de `routes/` se compone de componentes, y `App.svelte` monta las vistas y las piezas comunes.
- Los estilos se escriben con clases de Tailwind en el marcado.
- `app.css` guarda solo lo global de la aplicación: el tema (colores y fuentes), los estilos por defecto de toda la app (p. ej. el fondo, los campos, los botones y el foco) y las `@utility` que comparten muchas piezas (p. ej. `paper`, `cost-table`).
- El estilo fijo y largo de una pieza que solo usa un componente va en su bloque `<style lang="postcss">`, como una clase que agrupa sus clases de Tailwind con `@apply` (con un `@reference` a `app.css` para que las conozca). Esa clase gana a las de Tailwind del marcado, así que el marcado no repite propiedades suyas.
- Lo que cambia (clases condicionales, tamaños por prop y colores calculados) se queda en el marcado.
- Lo que es igual para todas las instancias de un componente (constantes, tablas de etiquetas, funciones que no usan sus props ni su estado, o algo que debe existir una sola vez) va en su `<script lang="ts" module>` (p. ej. `Dialog.svelte` e `Icon.svelte`).

## Commits

- Cada commit es atómico, en inglés, sigue Conventional Commits (con ámbito cuando el cambio es específico) y es una sola línea, lo más corta posible. El mensaje es únicamente esa línea.
- Cuando te pida commits:
  1. Prepara una hoja de ruta con cada commit: su mensaje y un resumen breve de lo que hace y de los archivos que toca.
  2. Pasa a staging el primer commit y pregúntame si quiero cambios o lo confirmo.
  3. Cuando te diga que lo confirme, haz ese commit, pasa a staging el siguiente y vuelve a preguntarme.
  4. Repite hasta terminar la hoja de ruta.
- El staging se prepara siempre con comandos de git y sin tocar los archivos de trabajo: los archivos enteros con `git add`, y las líneas sueltas con un parche aplicado al índice (`git apply --cached`).

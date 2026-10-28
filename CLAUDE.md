# Cuánto me cuesta

App local para apuntar lo que cuesta cada cosa que hago y ver en qué se va el dinero.

- Svelte 5 (runes) + TypeScript + Tailwind 4 + Vite, dentro de Electron.
- Editor de escritorio de archivos `.cmctxt`, con una sola ventana: **el proceso principal tiene la app y la ventana solo la muestra**.
  - Proceso principal: las hojas, las cuentas, el guardado, la vigilancia de los archivos, la recuperación y los diálogos.
  - Ventana: pinta la foto de cada hoja (`SheetView`) y manda cada cambio como orden (`SheetEdit`) con ids fijos (`IdRegistry`).
  - `ipc.ts`: el contrato entre los dos, con las órdenes (`Commands`) y los avisos (`Events`).
- Mapa de `src/`:
  - `main.server.ts`: el arranque.
  - `app/`: los controladores, que son `Document`, `DocumentController`, `WindowController`, `RecentFiles`, `TemplateController` y `UpdateController`.
  - `preload.server.ts`: el puente `window.api`, que la ventana usa desde `api.client.ts`.
  - `model/`: la hoja y sus cuentas; `model/text/`: el lector del texto.
  - `routes/`: las vistas por URL; `components/`: las piezas.
  - `store.client.svelte.ts`: el estado de la ventana.
- `pnpm run dev` abre la app y `pnpm run check` comprueba los tipos.
- `pnpm run build:<win|mac|linux>` hace los instaladores, y un tag `vX.Y.Z` publica la release.
- Interfaz en español de España, con coma decimal.
- Los datos se guardan en texto plano para que una persona o una IA los pueda leer y editar con facilidad, y así se pueda automatizar sin problemas. Por eso cada archivo es redundante a propósito: lleva costes, subtotales, resumen e instrucciones que la app recalcula o ignora al leer.
- Prioridad absoluta a la sencillez y al mantenimiento cero: usa solo las dependencias que ya tiene el proyecto.
- Revisa los cambios razonando sobre el código; prueba en la app solo cuando te lo pida.
- Las decisiones que son mías, pregúntamelas; las demás, toma la más simple y dímelo.
- Los archivos se modifican solo con las herramientas de edición (Edit y Write), para que yo vea cada cambio.
- Para las hojas y las plantillas, usa la skill `formato-datos`; para la interfaz, `diseno-cuaderno`.

## Reglas del código

- Código sencillo y mantenible: lo mínimo que resuelva el problema.
- Todo `if`, `else`, `for` y `while` lleva llaves.
- Indentación de 4 espacios.
- El sufijo dice dónde se ejecuta cada archivo:
  - `.server.ts` va en el proceso principal. Importa `.server.ts`, archivos generales, `electron` y Node.
  - `.client.ts` y `.client.svelte.ts` van en la ventana. Importan `.client`, archivos generales, `ipc.ts` y `model/`.
  - Sin sufijo es general: `model/`, `ipc.ts`, `colors.ts` y los `.svelte`.
- Las importaciones relativas llevan la extensión (`.ts`, `.svelte.ts`, `.svelte`).
- Comentarios en español, formales y cortos, con el estándar de documentación del lenguaje. Cada archivo empieza con uno que dice su función.
- Dónde va cada cosa:
  - Lógica de un objeto: método de su clase (`section.subtotal()`).
  - Lógica sin objeto: método estático (`Summary.combine()`).
  - Edición nueva: un caso de `SheetEdit`. Dato nuevo para la ventana: un campo de `SheetView`.
  - Orden nueva: en `Commands` y `COMMANDS`, registrada con `handle()` en su controlador.
  - Proceso principal: un controlador por responsabilidad, que recibe los demás por el constructor.

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

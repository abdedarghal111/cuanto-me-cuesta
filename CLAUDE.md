# Cuánto me cuesta

App local para apuntar lo que cuesta cada cosa que hago y ver en qué se va el dinero.

- Svelte 5 (runes) + TypeScript + Tailwind 4 + Vite; `src/lib/api.server.ts` sirve los `.txt`, montado en Vite como plugin, y `src/lib/api.client.ts` los pide desde el navegador.
- Abrir: `abrir.ps1` o `npm run abrir`. Comprobar: `npm run check`.
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
  - `.server.ts`: solo en Node, dentro del servidor de Vite (p. ej. `api.server.ts`, que usa `node:fs`).
  - `.client.ts` (o `.client.svelte.ts` si usa runes): solo en el navegador (p. ej. `main.client.ts`, `api.client.ts`, `documentos.client.svelte.ts`).
  - Sin sufijo: de uso general, sirve en los dos lados porque no depende ni de Node ni del navegador (p. ej. `formato/`, `colores.ts`). Un archivo así no importa nunca uno `.server` ni `.client`.
  - Los componentes `.svelte` son de navegador por naturaleza y no llevan sufijo.
- Las importaciones relativas llevan la extensión del archivo (`.ts`, `.svelte.ts`, `.svelte`), como pide el cargador nativo de configuración de Vite.
- Comentarios en español, formales, cortos, sobre lo que hace el código, y con el estándar de documentación oficial del lenguaje en funciones y tipos.
- Cada archivo empieza con un comentario formal que describe su función, según el estándar de documentación oficial del lenguaje.

## Commits

- Cada commit es atómico, en inglés, sigue Conventional Commits (con ámbito cuando el cambio es específico) y es una sola línea, lo más corta posible. El mensaje es únicamente esa línea.
- Cuando te pida commits:
  1. Prepara una hoja de ruta con cada commit: su mensaje y un resumen breve de lo que hace y de los archivos que toca.
  2. Pasa a staging el primer commit y pregúntame si quiero cambios o lo confirmo.
  3. Cuando te diga que lo confirme, haz ese commit, pasa a staging el siguiente y vuelve a preguntarme.
  4. Repite hasta terminar la hoja de ruta.
- El staging se prepara siempre con comandos de git y sin tocar los archivos de trabajo: los archivos enteros con `git add`, y las líneas sueltas con un parche aplicado al índice (`git apply --cached`).

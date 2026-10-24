# Cuánto me cuesta

<p align="center">
    <img src="./.github/images/logo.png" alt="App icon" width="200">
</p>

<p align="center">
    <a href="#qué-es-esto">Qué es esto</a> ·
    <a href="#funcionalidades">Funcionalidades</a> ·
    <a href="#modo-de-uso">Modo de uso</a> ·
    <a href="#desarrollo">Desarrollo</a>
</p>

## Qué es esto

Una app local para apuntar lo que cuesta cada cosa que hago y ver en qué se va el dinero. Cada producto es una hoja de costes: el filamento, la luz de la impresora, el desgaste, los fallos, mis horas… Cada línea calcula su propio coste, y la app suma, aplica los recargos y el margen, y te enseña por categorías dónde se va el dinero.

Nace de una pregunta sencilla que nunca sabía responder: «¿cuánto me ha costado esto de verdad?». Una hoja de cálculo se quedaba corta o se volvía un lío de fórmulas, así que la app hace las cuentas y yo solo apunto.

Los datos son archivos de texto normales, uno por producto, que se leen y se editan a mano con el Bloc de notas. Cada archivo lleva sus propias instrucciones al final, así que se le puede pasar a una IA para que lo rellene o lo revise sin explicarle nada. No hay base de datos, ni cuentas, ni nada que salga de tu equipo.

Es un proyecto personal, nacido de una necesidad propia y sin capas de más, sobre todo buscando la simplicidad o soluciones sencillas a acciones cotidianas.

## Funcionalidades

- **Hojas de costes:** un producto por hoja, con sus bloques de gastos y sus observaciones.
- **Cada línea hace sus cuentas:** precio, consumo y multiplicador, en números, en tiempo (`3d 5h 1m`) o como importe fijo.
- **Recargos y margen:** un % sobre un bloque (por ejemplo, el riesgo de fallos) o sobre el total (el margen).
- **Categorías:** cada línea lleva la suya, con su color, y el ranking «¿Dónde se va?» las compara.
- **Portada «Todo»:** el gasto de todos los productos juntos.
- **Plantilla:** un producto nuevo parte de la plantilla, y sus bloques se añaden con un clic.
- **Guardado a mano:** nada se escribe hasta que pulsas «Guardar» o Ctrl+S, y si cambias un archivo por fuera, la app lo recarga.
- **Lectura estricta:** si un archivo no encaja, la app dice en qué línea falla y qué esperaba.

## Modo de uso

Hace falta [Node.js](https://nodejs.org).

En Windows, doble clic en **`abrir.ps1`** (o clic derecho → «Ejecutar con PowerShell»). Abre la app en el navegador. Para cerrarla, cierra la ventana.

Desde una terminal, en cualquier sistema:

```
pnpm install
pnpm run abrir
```

Los productos se guardan en `datos/`, como `titulo_fecha.txt`. Lo que borras desde la app se queda como `algo.txt.borrado`, por si acaso. La plantilla de los productos nuevos es `src/res/template.txt`: una hoja normal que puedes cambiar a tu gusto.

## Desarrollo

```
pnpm run dev       # arranca sin abrir el navegador
pnpm run check     # comprueba los tipos
```

### Cómo está montado

Svelte 5, TypeScript y Tailwind 4 sobre Vite, sin servidor aparte: los endpoints se cuelgan del propio servidor de Vite.

| Pieza | Dónde | Qué hace |
|---|---|---|
| Modelo | `src/model/` | La hoja, sus bloques, líneas y recargos, con sus cuentas y cómo se escriben en texto |
| Lector | `src/model/text/` | Lee el `.txt` línea a línea, de forma estricta |
| Vistas | `src/routes/` | La portada «Todo» y la pantalla de cada producto, con sus llamadas al servidor |
| Piezas | `src/components/` | Las piezas de la pantalla que comparten las vistas |
| Estado | `src/store.client.svelte.ts` | Los productos abiertos, los cambios sin guardar y el guardado |
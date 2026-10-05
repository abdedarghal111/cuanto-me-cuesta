---
name: formato-datos
description: Formato de los archivos de texto de «Cuánto me cuesta» (productos en datos/ y la plantilla src/res/template.txt), cálculo del coste, guardado y categorías. Úsala siempre que vayas a tocar src/lib/formato.ts, src/lib/api.server.ts, src/lib/api.client.ts, src/lib/documentos.client.svelte.ts, la plantilla, el guardado o las categorías, o a leer o editar un .txt de datos/.
---

# Formato de los datos

Los `.txt` son la fuente de verdad y se tienen que poder leer y editar a mano.

## Archivos

- Cada producto es un archivo `datos/titulo_fecha.txt`; la app lo renombra al guardar si cambian el título o la fecha.
- Borrar un producto lo renombra a `nombre.txt.borrado`.
- La plantilla, `src/res/template.txt`, guarda los bloques que se copian al crear un bloque, las categorías de siempre, y los bloques y recargos sobre el total con los que empieza un producto nuevo. La app la usa directamente, sin copias. Cada vez que el servidor la lee, le reescribe al final `INSTRUCCIONES_PLANTILLA` de `formato/instrucciones.ts` (para crear productos a partir de ella) si faltan o no coinciden.
- El formato se implementa en `src/lib/formato/`, un módulo por tarea (`modelo`, `numeros`, `lineas`, `resumen`, `categorias`, `columnas`, `instrucciones`, `lectura`, `escritura`, `archivo`); `src/lib/formato.ts` reexporta la API pública. Un tipo de línea nuevo se añade en `REGLAS` de `lineas.ts`, en `Tipo` y `TIPOS` de `modelo.ts` y en `tipoDe` de `lectura.ts`.

## Estructura de un producto

En orden: cabecera (`Producto:`, `Fecha:`, `Categorías:`), `DESCRIPCIÓN`, bloques `## Título` con su fila de títulos, sus líneas y sus recargos, `SOBRE EL TOTAL`, `RESUMEN` e `INSTRUCCIONES`.

- Columnas de cada línea: `Cuenta | Concepto | Tipo | Precio € | Por | Unidad | Consumo | Multiplicador | Categoría | = Coste`. El orden lo marca la fila de títulos de cada bloque; «Usado» y «Cantidad» se leen como «Consumo» y «Multiplicador».
- Coste = Precio / Por × Consumo × Multiplicador.
- Tipo (fijo en la app): `número`; `tiempo`, con Unidad `d`, `h` o `min`, Por como número en esa unidad y Consumo como duración (`3d 5h 1m 3s`, `15:08` o un número en la unidad), que se guarda como `3d 5h 1m 3s`; `fijo`, con Precio y Por a 1 y el importe en Consumo. Sin columna Tipo, una línea es `tiempo` si su unidad es `h` o su consumo lleva `:`.
- Unidad es texto libre y solo interviene en el cálculo en `tiempo`.
- Recargos de un bloque: tras una línea que empieza por `--`, con columnas `Cuenta | Concepto | % | Categoría | = Coste`. Cada uno es un % de la base del bloque (la suma de sus líneas que cuentan) y se suman entre sí.
- `SOBRE EL TOTAL`: las mismas columnas más `= Importe | = Acumulado`. Se aplican en orden, cada uno sobre lo acumulado (p. ej. margen).
- Los campos son números simples con coma decimal.
- El coste de cada línea, las bases, los subtotales, los importes, el `RESUMEN` y las `INSTRUCCIONES` se escriben para leerlos a mano y se recalculan al cargar.

## Al cambiar el formato

- Los archivos con formatos anteriores se siguen leyendo.
- Leer → escribir → leer deja los datos iguales.
- Actualiza a la vez `INSTRUCCIONES`, `INSTRUCCIONES_PLANTILLA` y `REGLAS_LINEAS` de `formato/instrucciones.ts`, y el `README.md`.

## Guardado

Se guarda solo con el botón Guardar o con Ctrl+S. Hasta entonces, los cambios viven en memoria (`sucios`, en `src/lib/documentos.client.svelte.ts`) y `beforeunload` avisa al cerrar.

## Categorías

- En el código se llaman `tag`; al usuario se le muestran siempre como «categoría».
- Cada documento declara las suyas en `Categorías:`, y los nuevos empiezan con las de la plantilla.
- Cada línea lleva una categoría. Al leer, se añaden a la lista las que usen las líneas.
- Quitar una categoría deja sus líneas sin categoría, tras confirmarlo.

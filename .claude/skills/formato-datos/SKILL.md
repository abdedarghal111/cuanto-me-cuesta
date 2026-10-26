---
name: formato-datos
description: Formato de los archivos de texto de «Cuánto me cuesta»: las hojas de costes de datos/ y la plantilla src/res/template.txt. Estructura, columnas, tipos de línea, recetas, cálculo del coste, recargos, escapes, categorías y qué se ignora al leer. Úsala siempre que vayas a leer, escribir o editar uno de esos .txt, o a cambiar su formato.
---

# Formato de los datos

Los `.txt` son la fuente de verdad: una persona o una IA los lee y los edita a mano, y la app los lee de forma estricta.

## Archivos

- Cada hoja de costes es un archivo `datos/titulo_fecha.txt`; la app lo renombra al guardar si cambian el nombre o la fecha.
- Borrar una hoja la renombra a `nombre.txt.borrado`.
- La plantilla, `src/res/template.txt`, es una hoja normal con el mismo formato. Una hoja nueva es una copia de ella con su nombre y la fecha de hoy, y «+ nueva sección» copia una de sus secciones (con la receta a la que llamen sus líneas, si la hoja no la tiene).

## Estructura de una hoja

````
# Nombre de la hoja
Fecha: AAAA-MM-DD
Categorías: Material, Impresora, Mano de obra

```observaciones
Texto libre de varias líneas.
```

## [Receta] Impresión 3D (tiempo, gramos) (= tiempo × 0,128 €/h + gramos × 0,012 €/g + 15 %)
Cuenta | Concepto | Tipo | Precio | Cantidad | Categoría | = Coste
sí     | …

## Título de la sección (= subtotal 1,77 €)
Cuenta | Concepto | Tipo | Precio | Cantidad | Categoría | = Coste
sí     | …

### Recargos (= base 1,54 €)
Cuenta | Concepto | % | Categoría | = Coste
sí     | …

# Sobre el total (= coste 13,60 € → total 13,60 €)
Cuenta | Concepto | % | Categoría | = Importe | = Acumulado
no     | …

# Resumen
…
# Instrucciones
…
````

- Delimitadores: `#` abre la hoja (su nombre), `##` una sección (`## [Receta]` si es una receta), `### Recargos` los recargos de la sección, `# Sobre el total` los recargos globales y `# Resumen` el final de lo que se lee. Cada título cierra la parte anterior.
- Orden: nombre, `Fecha:`, `Categorías:`, observaciones, secciones y `# Sobre el total`.
- Las observaciones van en un bloque ` ```observaciones ` … ` ``` ` y se toman tal cual. El bloque va siempre, aunque esté vacío. Si el texto contiene una línea ` ``` `, el bloque se escribe con una valla más larga (```` ```` ````).
- `# Sobre el total` aparece cuando hay recargos globales.
- Columnas de cada línea: `Cuenta | Concepto | Tipo | Precio | Cantidad | Categoría | = Coste`, en el orden de la fila de títulos.
- Coste = precio de una unidad × Cantidad.
- Tipo y celda Precio:
  - `fijo`: el precio de una unidad (`6,5 €`).
  - `lote`: lo que costó el lote y lo que trae, con su unidad de texto libre (`4,2 € por 20 ud`); una unidad cuesta precio / lo que trae, y lo que trae vacío vale 1.
  - `horas`: el precio de una hora (`12 €/h`).
  - `luz`: la potencia y el precio de la luz (`140 W a 0,20 €/kWh`); una hora cuesta W / 1000 × €/kWh.
  - El título de una receta: la línea la llama (ver abajo).
- Cantidad: un número; en `horas`, `luz` y en un `lote` con unidad `d`, `h` o `min`, una duración (`3d 5h 1m 3s`, `15:08` o un número en esa unidad), que se guarda como `3d 5h 1m 3s`.
- Recargos de una sección: cada uno es un % de la base de la sección (la suma de sus líneas que cuentan) y se suman entre sí.
- Recargos sobre el total: se aplican en orden, cada uno sobre lo acumulado (p. ej. margen).
- Cuenta: `sí` suma; `no` se muestra sin sumar.
- Números con coma decimal y sin punto de miles.
- Las tablas se alinean con espacios, con los números a la derecha.

## Recetas

- Una receta es una sección `## [Receta] Título (dato, dato)` con hasta 3 datos de entrada (o ninguno, `()`), que no suma por sí sola. La app las muestra arriba, en el estante «Recetas».
- Sus líneas son de los tipos básicos, y en Cantidad llevan el nombre de uno de sus datos (`gramos`) o un número fijo. Un dato usado por una línea que se gasta por duraciones es de tiempo.
- Sus recargos se aplican en cada unidad que se calcula.
- Una línea la llama con su título en Tipo y sus datos en Precio, separados por ` · ` (`tiempo 43m · gramos 9,6`). Una unidad cuesta lo que la receta con esos datos, recargos incluidos, y la Cantidad dice cuántas.
- La línea que llama no lleva categoría: su coste se reparte en las categorías de la receta.
- Dentro de una receta no se llama a otra.
- El título lleva calculada su fórmula, `(= tiempo × 0,128 €/h + gramos × 0,012 €/g + 15 %)`, y cada línea su precio por unidad de dato (`= 0,012 €/g`).

## Escapes

En los campos de una línea (celdas, títulos y `Categorías:`):

- `|` se escribe `\|`, `,` dentro de una categoría se escribe `\,` y `\` se escribe `\\`.
- Los saltos de línea se escriben como un espacio, y los espacios de los extremos se recortan.
- Dentro del bloque de observaciones el texto va tal cual.

## Lectura

- La lectura es estricta: al primer fallo se para y se indica el número de línea, la línea y lo que se esperaba.
- Se comprueban la estructura, que cada columna aparezca una vez, que cada fila tenga tantas celdas como columnas, Cuenta (`sí` o `no`), Tipo (`fijo`, `lote`, `horas`, `luz` o el título de una receta), que Precio encaje con el Tipo, que los datos sean los de la receta y no pasen de 3, los escapes y que cada categoría usada esté declarada en `Categorías:`.
- Se lee hasta `# Resumen`. Las columnas que empiezan por `=` y el último `(= …)` de cada título son valores calculados: se escriben para leerlos a mano y se ignoran al leer.
- Se aceptan fines de línea `\r\n` y `\n`.

## Escritura

- Al guardar se recalculan los valores `= …` y se escriben siempre `# Resumen` y `# Instrucciones`.
- Las instrucciones son normas imperativas, claras y sencillas para quien edite el archivo.

## Categorías

- Cada hoja declara las suyas en `Categorías:`, y las nuevas empiezan con las de la plantilla.
- Cada línea y cada recargo llevan una categoría de esa lista; la categoría vacía es «Sin categoría».
- Quitar una categoría deja sus líneas sin categoría, tras confirmarlo.

## Ejemplo completo

Una hoja tal como la escribe la app. Imítala al escribir o editar una hoja: cada parte en este orden, con la misma alineación, los mismos valores `= …` y las mismas instrucciones al final.

- `Impresión 3D` es una receta: `Paralela de prueba` la llama con `tiempo 5:25 · gramos 70,7`, y la app guarda `5:25` como `5h 25m`.
- `0:45` se escribió a mano y la app lo guarda como `45m`.
- `Envío` es de tipo `fijo`: un importe se escribe como una unidad por su precio.
- `Diseño prototipo y producto` lleva `no`: se calcula su coste, pero no suma; aparece en «(no cuenta)».
- `Tornillos M3 \| M4` muestra el escape de `|`.

`````
# Paralelas Tomás
Fecha: 2026-10-05
Categorías: Material, Prototipo, Diseño, Mano de obra, Margen

```observaciones
Remodelación: ya tenía tornillos y palos. 2 paralelas.
Pendiente: confirmar el precio del filamento con el proveedor.
```

## [Receta] Impresión 3D (tiempo, gramos) (= tiempo × 0,128 €/h + gramos × 0,012 €/g + 15 %)
Cuenta | Concepto                 | Tipo | Precio            | Cantidad | Categoría |     = Coste
sí     | Filamento PLA            | lote | 12 € por 1000 g   |   gramos | Prototipo | = 0,012 €/g
sí     | Luz 140 W a 0,20 €/kWh   | luz  | 140 W a 0,2 €/kWh |   tiempo | Prototipo | = 0,028 €/h
sí     | Desgaste de la impresora | lote | 300 € por 3000 h  |   tiempo | Prototipo |   = 0,1 €/h

### Recargos (= sobre cada unidad)
Cuenta | Concepto          |  % | Categoría |          = Coste
sí     | Riesgo por fallos | 15 | Prototipo | = en cada unidad

## Prototipado 3D (= subtotal 1,77 €)
Cuenta | Concepto           | Tipo         | Precio                      | Cantidad | Categoría |  = Coste
sí     | Paralela de prueba | Impresión 3D | tiempo 5h 25m · gramos 70,7 |        1 |           | = 1,77 €

## Material (= subtotal 5,10 €)
Cuenta | Concepto                        | Tipo | Precio        | Cantidad | Categoría |  = Coste
sí     | Tornillos M3 \| M4 (paquete 30) | lote | 6 € por 30 ud |        8 | Material  | = 1,60 €
sí     | Envío                           | fijo | 3,5 €         |        1 | Material  | = 3,50 €

## Mis horas (= subtotal 7,50 €)
Cuenta | Concepto                    | Tipo  | Precio | Cantidad | Categoría    |   = Coste
sí     | Montaje                     | horas | 10 €/h |      45m | Mano de obra |  = 7,50 €
no     | Diseño prototipo y producto | horas | 10 €/h |       3h | Diseño       | = 30,00 €

# Sobre el total (= coste 14,37 € → total 18,68 €)
Cuenta | Concepto |  % | Categoría | = Importe | = Acumulado
sí     | Margen   | 30 | Margen    |  = 4,31 € |   = 18,68 €

# Resumen
Prototipo       1,77 €    9,5 %
Material        5,10 €   27,3 %
Mano de obra    7,50 €   40,1 %
Margen          4,31 €   23,1 %
TOTAL          18,68 €
(no cuenta)    30,00 €
Guardado: 13/10/2026, 13:59:51

# Instrucciones
- Edita solo lo que hay antes de «# Resumen». El resumen y estas instrucciones los rehace la app al guardar.
- Mantén el orden: título, Fecha, Categorías, observaciones, secciones y «# Sobre el total».
- Escribe el nombre de la hoja detrás de «# » en la primera línea.
- Escribe la fecha como AAAA-MM-DD.
- Escribe en Categorías todas las que uses, separadas por comas.
- Escribe las observaciones entre ```observaciones y ```. Dentro puedes poner lo que quieras.
- Abre cada sección con «## Título». Sus recargos van debajo, con «### Recargos».
- Escribe una fila por gasto, con las columnas en el orden de la fila de títulos.
- Escribe los números con coma decimal y sin punto de miles. No uses fórmulas.
- Pon «sí» en Cuenta para que sume y «no» para que se vea sin sumar.
- Elige el Tipo y escribe en Precio lo que cuesta una unidad:
    fijo:  el precio de una unidad (6,5 €).
    lote:  lo que costó el lote y lo que trae (4,2 € por 20 ud).
    horas: el precio de una hora (12 €/h).
    luz:   la potencia y el precio de la luz (140 W a 0,20 €/kWh).
- Escribe en Cantidad cuántas unidades gastas (3 o 350). En horas, en luz y en un lote por d, h o min, escribe una duración (3d 5h 1m 3s o 15:08).
- Calcula así: Coste = precio de una unidad × Cantidad.
- Abre una receta con «## [Receta] Título (dato, dato)», con hasta 3 datos. No suma por sí sola. En Cantidad, sus líneas llevan el nombre de un dato o un número.
- Para usar una receta, pon su título en Tipo, sus datos en Precio separados por « · » (tiempo 43m · gramos 9,6) y en Cantidad cuántas veces. Una unidad cuesta lo que la receta con esos datos, con sus recargos.
- Cada recargo de sección es un % de la suma de las líneas que suman en esa sección.
- Los recargos de «# Sobre el total» se aplican en orden, cada uno sobre lo acumulado.
- Si un texto lleva | escribe \|. Si una categoría lleva una coma escribe \,. Si lleva \ escribe \\.
- No edites lo que empieza por «=» ni lo que va entre «(= …)»: lo calcula la app.
`````

## Al cambiar el formato

- Leer → escribir → leer deja los datos iguales.
- Actualiza a la vez las instrucciones que se escriben en cada hoja, esta skill y el `README.md`.

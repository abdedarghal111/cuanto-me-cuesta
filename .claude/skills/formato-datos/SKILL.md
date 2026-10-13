---
name: formato-datos
description: Formato de los archivos de texto de «Cuánto me cuesta»: las hojas de costes de datos/ y la plantilla src/res/template.txt. Estructura, columnas, tipos de línea, cálculo del coste, recargos, escapes, categorías y qué se ignora al leer. Úsala siempre que vayas a leer, escribir o editar uno de esos .txt, o a cambiar su formato.
---

# Formato de los datos

Los `.txt` son la fuente de verdad: una persona o una IA los lee y los edita a mano, y la app los lee de forma estricta.

## Archivos

- Cada hoja de costes es un archivo `datos/titulo_fecha.txt`; la app lo renombra al guardar si cambian el nombre o la fecha.
- Borrar una hoja la renombra a `nombre.txt.borrado`.
- La plantilla, `src/res/template.txt`, es una hoja normal con el mismo formato. Una hoja nueva es una copia de ella con su nombre y la fecha de hoy, y «añadir bloque» copia una de sus secciones.

## Estructura de una hoja

````
# Nombre de la hoja
Fecha: AAAA-MM-DD
Categorías: Material, Impresora, Mano de obra

```observaciones
Texto libre de varias líneas.
```

## Título de la sección (= subtotal 1,77 €)
Cuenta | Concepto | Tipo | Precio € | Por | Unidad | Consumo | Multiplicador | Categoría | = Coste
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

- Delimitadores: `#` abre la hoja (su nombre), `##` una sección, `### Recargos` los recargos de la sección, `# Sobre el total` los recargos globales y `# Resumen` el final de lo que se lee. Cada título cierra la parte anterior.
- Orden: nombre, `Fecha:`, `Categorías:`, observaciones, secciones y `# Sobre el total`.
- Las observaciones van en un bloque ` ```observaciones ` … ` ``` ` y se toman tal cual. El bloque va siempre, aunque esté vacío. Si el texto contiene una línea ` ``` `, el bloque se escribe con una valla más larga (```` ```` ````).
- `# Sobre el total` aparece cuando hay recargos globales.
- Columnas de cada línea: `Cuenta | Concepto | Tipo | Precio € | Por | Unidad | Consumo | Multiplicador | Categoría | = Coste`, en el orden de la fila de títulos.
- Coste = Precio / Por × Consumo × Multiplicador. Por y Multiplicador vacíos valen 1.
- Tipo: `número`; `tiempo`, con Unidad `d`, `h` o `min`, Por como número en esa unidad y Consumo como duración (`3d 5h 1m 3s`, `15:08` o un número en la unidad), que se guarda como `3d 5h 1m 3s`; `fijo`, con Precio y Por a 1 y el importe en Consumo.
- Unidad es texto libre y solo interviene en el cálculo en `tiempo`.
- Recargos de una sección: cada uno es un % de la base de la sección (la suma de sus líneas que cuentan) y se suman entre sí.
- Recargos sobre el total: se aplican en orden, cada uno sobre lo acumulado (p. ej. margen).
- Cuenta: `sí` suma; `no` se muestra sin sumar.
- Números con coma decimal y sin punto de miles.
- Las tablas se alinean con espacios, con los números a la derecha.

## Escapes

En los campos de una línea (celdas, títulos y `Categorías:`):

- `|` se escribe `\|`, `,` dentro de una categoría se escribe `\,` y `\` se escribe `\\`.
- Los saltos de línea se escriben como un espacio, y los espacios de los extremos se recortan.
- Dentro del bloque de observaciones el texto va tal cual.

## Lectura

- La lectura es estricta: al primer fallo se para y se indica el número de línea, la línea y lo que se esperaba.
- Se comprueban la estructura, que cada columna aparezca una vez, que cada fila tenga tantas celdas como columnas, Cuenta (`sí` o `no`), Tipo (`número`, `tiempo` o `fijo`), los escapes y que cada categoría usada esté declarada en `Categorías:`.
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

- `5:25` y `0:45` se escribieron a mano y la app los guarda como `5h 25m` y `45m`.
- `Envío` es de tipo `fijo`: el importe va en Consumo, y Precio y Por valen 1.
- `Diseño prototipo y producto` lleva `no`: se calcula su coste, pero no suma; aparece en «(no cuenta)».
- `Tornillos M3 \| M4` muestra el escape de `|`.

`````
# Paralelas Tomás
Fecha: 2026-10-05
Categorías: Material, Impresora, Prototipo, Diseño, Mano de obra, Margen

```observaciones
Remodelación: ya tenía tornillos y palos. 2 paralelas.
Pendiente: confirmar el precio del filamento con el proveedor.
```

## Prototipado 3D (= subtotal 1,77 €)
Cuenta | Concepto                     | Tipo   | Precio € |  Por | Unidad | Consumo | Multiplicador | Categoría | = Coste
sí     | Filamento prototipo          | número |       12 | 1000 | g      |    70,7 |             1 | Prototipo | = 0,85 €
sí     | Gasto Luz 140 W a 0,20 €/kWh | tiempo |    0,028 |    1 | h      |  5h 25m |             1 | Prototipo | = 0,15 €
sí     | Desgaste Impresora en 3000 h | tiempo |      300 | 3000 | h      |  5h 25m |             1 | Prototipo | = 0,54 €

### Recargos (= base 1,54 €)
Cuenta | Concepto          |  % | Categoría |  = Coste
sí     | Riesgo por fallos | 15 | Prototipo | = 0,23 €

## Material (= subtotal 5,10 €)
Cuenta | Concepto                        | Tipo   | Precio € | Por | Unidad | Consumo | Multiplicador | Categoría | = Coste
sí     | Tornillos M3 \| M4 (paquete 30) | número |        6 |  30 | uds    |       4 |             2 | Material  | = 1,60 €
sí     | Envío                           | fijo   |        1 |   1 |        |     3,5 |             1 | Material  | = 3,50 €

## Mis horas (= subtotal 7,50 €)
Cuenta | Concepto                    | Tipo   | Precio € | Por | Unidad | Consumo | Multiplicador | Categoría    | = Coste
sí     | Montaje                     | tiempo |       10 |   1 | h      |     45m |             1 | Mano de obra | = 7,50 €
no     | Diseño prototipo y producto | tiempo |       10 |   1 | h      |      3h |             1 | Diseño       | = 30,00 €

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
- Elige el Tipo:
    número: Consumo es un número (228,4).
    tiempo: Unidad d, h o min; Consumo es una duración (3d 5h 1m 3s o 15:08).
    fijo:   escribe el importe en Consumo; Precio y Por valen 1.
- Calcula así: Coste = Precio / Por × Consumo × Multiplicador.
- Cada recargo de sección es un % de la suma de las líneas que suman en esa sección.
- Los recargos de «# Sobre el total» se aplican en orden, cada uno sobre lo acumulado.
- Si un texto lleva | escribe \|. Si una categoría lleva una coma escribe \,. Si lleva \ escribe \\.
- No edites lo que empieza por «=» ni lo que va entre «(= …)»: lo calcula la app.
`````

## Al cambiar el formato

- Leer → escribir → leer deja los datos iguales.
- Actualiza a la vez las instrucciones que se escriben en cada hoja, esta skill y el `README.md`.

/**
 * @file Instrucciones que se escriben al final de los productos y de la plantilla para quien los edite a mano.
 */

import { ANCHO } from './columnas'

/** Reglas de las líneas de gasto, comunes a los productos y a la plantilla. */
const REGLAS_LINEAS = [
    '- Cada línea de un bloque:',
    '    Cuenta | Concepto | Tipo | Precio € | Por | Unidad | Consumo | Multiplicador | Categoría | = Coste',
    '  Coste = Precio / Por × Consumo × Multiplicador. Por y Multiplicador vacíos = 1.',
    '  Ej.: 11,21 € por 1000 g, consumo 228,4 g, multiplicador 2 → 5,12 €.',
    '  Multiplicador = cuántas veces se repite el consumo; admite decimales (0,5).',
    '  Unidad = texto libre para leerlo (g, m, l, uds…); solo cuenta en tiempo.',
    '- Tipo: cómo se escriben Por y Consumo.',
    '    número: números (228,4).',
    '    tiempo: Unidad d, h o min; Por es un número en esa unidad (300 € por',
    '            3000 h) y Consumo una duración: 3d 5h 1m 3s, 15:08 (horas:minutos)',
    '            o un número en la unidad.',
    '    fijo:   un importe en €. Precio y Por valen 1 y el importe va en Consumo.',
    '- La fila de títulos de cada bloque dice el orden de las columnas; sin ella se',
    '  usa el orden de arriba.',
    '- Cuenta: "sí" suma; "no" se ve pero no suma.',
    '- Solo números, con coma decimal y sin punto de miles (nada de fórmulas).',
    '- Recargos de un bloque: tras sus líneas, una línea "-- Recargos --" y debajo',
    '    Cuenta | Concepto | % | Categoría | = Coste',
    '  Cada uno es un % de la base del bloque (la suma de sus líneas que cuentan);',
    '  si hay varios, se suman. Ej.: base 8 € y 15 % → 1,20 €.',
    '- SOBRE EL TOTAL: tras los bloques, una línea "SOBRE EL TOTAL" y debajo',
    '    Cuenta | Concepto | % | Categoría | = Importe | = Acumulado',
    '  Se aplican en orden, cada uno sobre lo acumulado hasta él (p. ej. margen).',
]

/** Instrucciones al final de cada archivo para quien lo edite a mano. */
export const INSTRUCCIONES = [
    'INSTRUCCIONES (para quien edite este archivo, persona o IA)',
    '-'.repeat(ANCHO),
    '- Es un producto de «Cuánto me cuesta». La app lo lee y lo reescribe al guardar.',
    '- Orden: cabecera (Producto, Fecha, Categorías) · DESCRIPCIÓN · bloques "## Título" ·',
    '  SOBRE EL TOTAL · RESUMEN · INSTRUCCIONES.',
    '- Al cargar solo se leen Producto, Fecha, la descripción, y las líneas y',
    '  recargos de los bloques y de SOBRE EL TOTAL. Lo que va tras "=", las bases,',
    '  los subtotales, RESUMEN e INSTRUCCIONES se rehacen solos, así que si no',
    '  cuadran no pasa nada.',
    '- DESCRIPCIÓN: texto libre de varias líneas con anotaciones del documento.',
    '  Ninguna línea puede empezar por "##", "SOBRE EL TOTAL", "RESUMEN" ni',
    '  "INSTRUCCIONES".',
    ...REGLAS_LINEAS,
    '- Categorías: la línea "Categorías:" de la cabecera dice cuáles hay en este',
    '  documento, separadas por comas. Cada línea de gasto lleva una de ellas (sirve',
    '  para ver en qué se va el dinero). Una nueva se añade primero ahí. Las de',
    '  siempre, para documentos nuevos, están en la plantilla (src/res/template.txt).',
    '- No uses "|" dentro de un texto: separa columnas.',
    '- Para añadir un gasto copia una línea dentro de su bloque y cambia los valores.',
    '  Para un bloque nuevo escribe "## Título" y debajo sus líneas.',
    '- El archivo se llama titulo_fecha.txt; la app le cambia el nombre al guardar',
    '  si cambias el producto o la fecha.',
]

/** Instrucciones que el servidor mantiene al final de la plantilla, para hacer productos a partir de ella. */
export const INSTRUCCIONES_PLANTILLA = [
    'INSTRUCCIONES (para quien use esta plantilla, persona o IA)',
    '-'.repeat(ANCHO),
    '- Es la plantilla de «Cuánto me cuesta». La app solo lee Categorías, Por',
    '  defecto, los bloques y SOBRE EL TOTAL; desde INSTRUCCIONES se ignora.',
    '- Para crear un producto a partir de ella, escribe un archivo nuevo con:',
    '    Producto: nombre del producto',
    '    Fecha:    AAAA-MM-DD',
    '    Categorías: las de esta plantilla que uses, separadas por comas',
    '    DESCRIPCIÓN',
    '    texto libre de varias líneas: encargo, presupuesto, supuestos...',
    '    los bloques "## Título" que hagan falta, con su fila de títulos y sus líneas',
    '    SOBRE EL TOTAL, si hace falta',
    '  Copia los bloques, líneas y recargos que sirvan, rellena Consumo y Multiplicador,',
    '  cambia lo que haga falta y quita lo que sobre. El producto no lleva',
    '  "Por defecto:".',
    '- En la DESCRIPCIÓN, ninguna línea puede empezar por "##", "SOBRE EL TOTAL",',
    '  "RESUMEN" ni "INSTRUCCIONES".',
    ...REGLAS_LINEAS,
    '- Cada línea lleva una categoría de la lista. No uses "|" dentro de un texto.',
    '- Si te dan un presupuesto, ajusta los consumos a él y anota en la',
    '  DESCRIPCIÓN el total que sale y lo que has supuesto.',
    '- No hace falta escribir lo que va tras "=", bases, subtotales ni resumen: la',
    '  app los calcula y al guardar añade sus propias instrucciones.',
    '- El archivo se llama titulo_fecha.txt (p. ej. paralelas-tomas_2026-10-04.txt)',
    '  y va en la carpeta datos/.',
].join('\n')

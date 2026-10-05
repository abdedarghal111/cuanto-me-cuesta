/**
 * @file Modelo de datos de un producto y de la plantilla: tipos y valores vacíos.
 */

/**
 * Tipo de una línea: cómo se escriben «Por» y «Consumo».
 * `number`: números con decimales; `time`: la Unidad es d, h o min, Por es un número en esa unidad y el Consumo
 * una duración ("3d 5h 1m 3s"); `fixed`: Precio y Por valen 1 y el Consumo es el importe en €.
 */
export type LineType = 'number' | 'time' | 'fixed'

/** Nombre de cada tipo en el archivo y en la pantalla. */
export const LINE_TYPE_LABELS: Record<LineType, string> = { number: 'número', time: 'tiempo', fixed: 'fijo' }

/** Línea de gasto. Los números se guardan como texto tal cual se escriben ("11,21", "0,5", "15:08"). */
export interface Line {
    /** Si es `false`, la línea se muestra pero no suma. */
    counts: boolean
    name: string
    type: LineType
    price: string
    per: string
    /** Texto libre para leer la línea (g, m, l, uds…); no interviene en el cálculo. */
    unit: string
    usage: string
    /** Cuántas veces se repite el consumo; multiplica el coste. Admite decimales. */
    multiplier: string
    tag: string
}

/** Recargo en porcentaje: en un bloque, sobre la base del bloque; en «Sobre el total», sobre lo acumulado. */
export interface Surcharge {
    /** Si es `false`, el recargo se muestra pero no suma. */
    counts: boolean
    name: string
    /** Porcentaje, como texto ("15"). */
    percent: string
    tag: string
}

/** Bloque de gastos con título (`## Título`). */
export interface Section {
    title: string
    lines: Line[]
    /** Recargos sobre la suma de las líneas del bloque que cuentan; se suman entre sí. */
    surcharges: Surcharge[]
}

/** Producto: un archivo `titulo_fecha.txt`. */
export interface Product {
    name: string
    /** AAAA-MM-DD; forma parte del nombre del archivo. */
    date: string
    /** Texto libre de varias líneas. */
    description: string
    /** Categorías del producto (línea `Categorías:`). */
    tags: string[]
    sections: Section[]
    /** Recargos sobre el total, que se aplican en orden sobre lo acumulado (p. ej. margen). */
    totalSurcharges: Surcharge[]
}

/** Contenido de la plantilla (`src/res/template.txt`): el mismo formato, con `Categorías:` y `Por defecto:`. */
export interface Template {
    tags: string[]
    /** Títulos de los bloques con los que empieza un producto nuevo. */
    defaultSectionTitles: string[]
    sections: Section[]
    /** Recargos sobre el total con los que empieza un producto nuevo. */
    totalSurcharges: Surcharge[]
}

/** Línea nueva, de tipo número, con la categoría dada. */
export function emptyLine(tag = ''): Line {
    return { counts: true, name: '', type: 'number', price: '', per: '1', unit: '', usage: '', multiplier: '1', tag }
}

/** Recargo nuevo con la categoría dada. */
export function emptySurcharge(tag = ''): Surcharge {
    return { counts: true, name: '', percent: '', tag }
}

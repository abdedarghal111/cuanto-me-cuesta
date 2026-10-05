/**
 * @file Modelo de datos de un producto y de la plantilla: tipos y valores vacíos.
 */

/**
 * Tipo de una línea: cómo se escriben «Por» y «Consumo».
 * `numero`: números con decimales; `tiempo`: la Unidad es d, h o min, Por es un número en esa unidad y el Consumo
 * una duración ("3d 5h 1m 3s"); `fijo`: Precio y Por valen 1 y el Consumo es el importe en €.
 */
export type Tipo = 'numero' | 'tiempo' | 'fijo'

/** Nombre de cada tipo en el archivo y en la pantalla. */
export const TIPOS: Record<Tipo, string> = { numero: 'número', tiempo: 'tiempo', fijo: 'fijo' }

/** Línea de gasto. Los números se guardan como texto tal cual se escriben ("11,21", "0,5", "15:08"). */
export interface Linea {
    /** Si es `false`, la línea se muestra pero no suma. */
    cuenta: boolean
    concepto: string
    tipo: Tipo
    precio: string
    por: string
    /** Texto libre para leer la línea (g, m, l, uds…); no interviene en el cálculo. */
    unidad: string
    consumo: string
    /** Cuántas veces se repite el consumo; multiplica el coste. Admite decimales. */
    multiplicador: string
    tag: string
}

/** Recargo en porcentaje: en un bloque, sobre la base del bloque; en «Sobre el total», sobre lo acumulado. */
export interface Recargo {
    /** Si es `false`, el recargo se muestra pero no suma. */
    cuenta: boolean
    concepto: string
    /** Porcentaje, como texto ("15"). */
    pct: string
    tag: string
}

/** Bloque de gastos con título (`## Título`). */
export interface Seccion {
    titulo: string
    lineas: Linea[]
    /** Recargos sobre la suma de las líneas del bloque que cuentan; se suman entre sí. */
    recargos: Recargo[]
}

/** Producto: un archivo `titulo_fecha.txt`. */
export interface Documento {
    producto: string
    /** AAAA-MM-DD; forma parte del nombre del archivo. */
    fecha: string
    /** Texto libre de varias líneas. */
    descripcion: string
    /** Categorías del documento (línea `Categorías:`). */
    tags: string[]
    secciones: Seccion[]
    /** Recargos sobre el total, que se aplican en orden sobre lo acumulado (p. ej. margen). */
    sobreTotal: Recargo[]
}

/** Contenido de la plantilla (`src/res/template.txt`): el mismo formato, con `Categorías:` y `Por defecto:`. */
export interface Plantilla {
    tags: string[]
    /** Títulos de los bloques con los que empieza un documento nuevo. */
    porDefecto: string[]
    secciones: Seccion[]
    /** Recargos sobre el total con los que empieza un documento nuevo. */
    sobreTotal: Recargo[]
}

/** Línea nueva, de tipo número, con la categoría dada. */
export function lineaVacia(tag = ''): Linea {
    return { cuenta: true, concepto: '', tipo: 'numero', precio: '', por: '1', unidad: '', consumo: '', multiplicador: '1', tag }
}

/** Recargo nuevo con la categoría dada. */
export function recargoVacio(tag = ''): Recargo {
    return { cuenta: true, concepto: '', pct: '', tag }
}

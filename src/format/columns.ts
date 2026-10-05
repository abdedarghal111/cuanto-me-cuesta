/**
 * @file Columnas de las tablas del archivo: títulos al escribir y claves al leer.
 */

/** Ancho de las líneas de título y separadores. */
export const LINE_WIDTH = 78

export const LINE_HEADER = ['Cuenta', 'Concepto', 'Tipo', 'Precio €', 'Por', 'Unidad', 'Consumo', 'Multiplicador', 'Categoría', '= Coste']
export const SURCHARGE_HEADER = ['Cuenta', 'Concepto', '%', 'Categoría', '= Coste']
export const TOTAL_SURCHARGE_HEADER = ['Cuenta', 'Concepto', '%', 'Categoría', '= Importe', '= Acumulado']

/** Clave de cada columna en el orden por defecto; la fila de títulos de un bloque tiene prioridad. */
export const LINE_COLUMNS = ['counts', 'name', 'type', 'price', 'per', 'unit', 'usage', 'multiplier', 'tag']
/** Clave de cada columna de los recargos en el orden por defecto. */
export const SURCHARGE_COLUMNS = ['counts', 'name', 'percent', 'tag']

/** "Precio €" → "precio", "Categoría" → "categoria". */
export const normalizeKey = (text: string) =>
    text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '')

/** Clave de cada título de columna. «Usado» y «Cantidad» son los nombres anteriores de «Consumo» y «Multiplicador». */
const COLUMN_KEYS: Record<string, string> = {
    cuenta: 'counts',
    concepto: 'name',
    tipo: 'type',
    precio: 'price',
    por: 'per',
    unidad: 'unit',
    consumo: 'usage',
    usado: 'usage',
    multiplicador: 'multiplier',
    cantidad: 'multiplier',
    categoria: 'tag',
}

/** Clave de una columna a partir de su título: "%" → "percent", "Categoría" → "tag", "Usado" → "usage". */
export function columnKey(title: string): string {
    if (title.trim() === '%') {
        return 'percent'
    }
    const key = normalizeKey(title)
    return COLUMN_KEYS[key] ?? key
}

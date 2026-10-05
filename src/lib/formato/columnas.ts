/**
 * @file Columnas de las tablas del archivo: títulos al escribir y claves al leer.
 */

/** Ancho de las líneas de título y separadores. */
export const ANCHO = 78

export const CABECERA = ['Cuenta', 'Concepto', 'Tipo', 'Precio €', 'Por', 'Unidad', 'Consumo', 'Multiplicador', 'Categoría', '= Coste']
export const CABECERA_RECARGO = ['Cuenta', 'Concepto', '%', 'Categoría', '= Coste']
export const CABECERA_TOTAL = ['Cuenta', 'Concepto', '%', 'Categoría', '= Importe', '= Acumulado']

/** Clave de cada columna en el orden por defecto; la fila de títulos de un bloque tiene prioridad. */
export const COLUMNAS = ['cuenta', 'concepto', 'tipo', 'precio', 'por', 'unidad', 'consumo', 'multiplicador', 'tag']
/** Clave de cada columna de los recargos en el orden por defecto. */
export const COLUMNAS_RECARGO = ['cuenta', 'concepto', 'pct', 'tag']

/** "Precio €" → "precio", "Categoría" → "categoria". */
export const clave = (t: string) =>
    t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '')

/** Nombres anteriores de algunas columnas: «Usado» es «Consumo» y «Cantidad» es «Multiplicador». */
const ALIAS: Record<string, string> = { categoria: 'tag', usado: 'consumo', cantidad: 'multiplicador' }

/** Clave de una columna a partir de su título: "%" → "pct", "Categoría" → "tag", "Usado" → "consumo". */
export function claveColumna(t: string): string {
    if (t.trim() === '%') {
        return 'pct'
    }
    const k = clave(t)
    return ALIAS[k] ?? k
}

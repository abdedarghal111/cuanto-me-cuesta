/**
 * @file Tabla de texto con las columnas alineadas, para escribir las filas de una hoja.
 */

import type { Column } from './Column.ts'

/** Tabla que alinea sus columnas al escribirse; las de `rightAligned` van a la derecha. */
export class Table {
    /** Columnas de la tabla, en orden. */
    columns: Column[]
    /** Filas de celdas, sin escapar. */
    #rows: string[][] = []
    /** Separador entre columnas. */
    #separator: string

    /**
     * Crea una tabla vacía.
     * @param columns Columnas de la tabla.
     * @param separator Separador entre columnas.
     */
    constructor(columns: Column[], separator = ' | ') {
        this.columns = columns
        this.#separator = separator
    }

    /**
     * Añade una fila.
     * @param cells Celdas de la fila, en el orden de las columnas y sin escapar.
     */
    addRow(cells: string[]): void {
        this.#rows.push(cells)
    }

    /**
     * Escribe la tabla con las celdas escapadas y alineadas. La fila de títulos solo se escribe si alguna
     * columna tiene título.
     * @returns Una línea de texto por fila.
     */
    render(): string[] {
        const header = this.columns.some((column) => column.title) ? [this.columns.map((column) => column.title)] : []
        const rows = [...header, ...this.#rows].map((row) => row.map(Table.escape))
        const widths = this.columns.map((_, i) => Math.max(...rows.map((row) => (row[i] ?? '').length)))
        return rows.map((row) =>
            row
                .map((cell, i) => (this.columns[i]?.rightAligned ? cell.padStart(widths[i]) : cell.padEnd(widths[i])))
                .join(this.#separator)
                .trimEnd(),
        )
    }

    /**
     * Escapa un campo de una línea (celda, título o categoría): `\` → `\\` y `|` → `\|`; los saltos de línea pasan
     * a espacio y se recortan los espacios de los extremos. La coma de las categorías la escapa `Category`.
     * @param text Texto del campo.
     * @returns El texto escapado.
     */
    static escape(text: string): string {
        return text.replace(/\r?\n/g, ' ').trim().replace(/\\/g, '\\\\').replace(/\|/g, '\\|')
    }
}

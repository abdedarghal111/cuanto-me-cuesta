/**
 * @file Lector estricto del texto de una hoja: recorre sus líneas, reconoce los delimitadores y las tablas,
 * y al primer fallo lanza `ParseError`.
 */

import { CostSheet } from '../CostSheet.ts'
import type { Column } from './Column.ts'
import { Delimiter } from './Delimiter.ts'
import { ParseError } from './ParseError.ts'

/** Patrón de la línea de cada delimitador y lo que se espera si no está. */
const HEADINGS: Record<Delimiter, { pattern: RegExp; expected: string }> = {
    [Delimiter.SHEET]: { pattern: /^# (.+)$/, expected: '«# Nombre de la hoja»' },
    [Delimiter.OBSERVATIONS]: { pattern: /^(`{3,})observaciones\s*$/, expected: '«```observaciones»' },
    [Delimiter.SECTION]: { pattern: /^## (.+)$/, expected: '«## Título de la sección»' },
    [Delimiter.SURCHARGES]: { pattern: /^### Recargos$/, expected: '«### Recargos»' },
    [Delimiter.TOTAL]: { pattern: /^# Sobre el total$/, expected: '«# Sobre el total»' },
    [Delimiter.SUMMARY]: { pattern: /^# Resumen$/, expected: '«# Resumen»' },
    [Delimiter.INSTRUCTIONS]: { pattern: /^# Instrucciones$/, expected: '«# Instrucciones»' },
}

/**
 * Quita de un título los espacios de los extremos y su último «(= …)», que es calculado.
 * @param line Línea del título.
 * @returns El título sin lo calculado.
 */
const withoutComputed = (line: string) => line.trim().replace(/\s*\(=[^()]*\)$/, '')

/** Lector estricto de una hoja. Las líneas en blanco entre partes y filas se saltan. */
export class DocumentReader {
    /** Número de la última línea vista con `peek()` o `next()`, empezando por 1. */
    lineNumber = 0
    /** Clave de cada columna de la tabla actual; vacía en las calculadas («= …»). */
    columns: string[] = []
    /** Categorías declaradas en «Categorías:»; las filas solo pueden usar estas. */
    categories: string[] = []
    #lines: string[]
    #index = 0

    /**
     * Crea un lector al principio del texto.
     * @param text Texto de la hoja, con fines de línea `\r\n` o `\n`.
     */
    constructor(text: string) {
        this.#lines = text.split(/\r?\n/)
    }

    /**
     * Lee una hoja completa.
     * @param text Texto de la hoja.
     * @returns La hoja.
     * @throws {ParseError} Al primer fallo.
     */
    static read(text: string): CostSheet {
        return CostSheet.deserialize(new DocumentReader(text))
    }

    /**
     * Mira la siguiente línea con texto, sin avanzar más allá de ella.
     * @returns La línea, o `undefined` al final del texto.
     */
    peek(): string | undefined {
        while (this.#index < this.#lines.length && this.#lines[this.#index].trim() === '') {
            this.#index++
        }
        this.lineNumber = this.#index + 1
        return this.#lines[this.#index]
    }

    /**
     * Lee la siguiente línea con texto.
     * @returns La línea.
     * @throws {ParseError} Al final del texto.
     */
    next(): string {
        const line = this.peek()
        if (line === undefined) {
            return this.fail('más texto')
        }
        this.#index++
        return line
    }

    /**
     * Dice si la siguiente línea con texto es la de un delimitador.
     * @param delimiter Delimitador.
     * @returns `true` si lo es.
     */
    atHeading(delimiter: Delimiter): boolean {
        const line = this.peek()
        return line !== undefined && HEADINGS[delimiter].pattern.test(withoutComputed(line))
    }

    /**
     * Lee la línea de un delimitador.
     * @param delimiter Delimitador.
     * @returns El título que lleva (en `SHEET` y `SECTION`) sin escapes ni su último «(= …)»; si no, vacío.
     * @throws {ParseError} Si la línea no es la del delimitador.
     */
    heading(delimiter: Delimiter): string {
        const { pattern, expected } = HEADINGS[delimiter]
        const match = withoutComputed(this.peek() ?? '').match(pattern)
        if (!match) {
            return this.fail(expected)
        }
        this.next()
        return match[1] === undefined ? '' : this.unescape(match[1].trim())
    }

    /**
     * Lee un bloque con valla (` ```observaciones ` … ` ``` `) y toma su texto tal cual.
     * @param delimiter Delimitador del bloque.
     * @returns El texto de dentro, con `\n` como fin de línea.
     * @throws {ParseError} Si no empieza el bloque o falta su cierre.
     */
    readBlock(delimiter: Delimiter): string {
        const { pattern, expected } = HEADINGS[delimiter]
        const fence = this.expect(pattern, expected)[1]
        const start = this.lineNumber
        const text: string[] = []
        while (this.#index < this.#lines.length) {
            const line = this.#lines[this.#index++]
            if (line.trimEnd() === fence) {
                return text.join('\n')
            }
            text.push(line)
        }
        this.lineNumber = start
        return this.fail(`el cierre ${fence} del bloque`)
    }

    /**
     * Lee la siguiente línea con texto y comprueba que encaja con un patrón.
     * @param pattern Patrón de la línea.
     * @param expected Lo que se espera, para el error.
     * @returns Lo que encaja con el patrón.
     * @throws {ParseError} Si no encaja.
     */
    expect(pattern: RegExp, expected: string): RegExpMatchArray {
        const match = this.peek()?.match(pattern)
        if (!match) {
            return this.fail(expected)
        }
        this.next()
        return match
    }

    /**
     * Lee la fila de títulos de una tabla y fija `columns`. Cada columna de datos tiene que estar una vez;
     * las calculadas («= …») se ignoran.
     * @param columns Columnas de la tabla.
     * @throws {ParseError} Si falta, sobra o se repite una columna.
     */
    readColumns(columns: Column[]): void {
        const dataColumns = columns.filter((column) => !column.title.startsWith('='))
        const titles = this.#split(this.next()).map((title) => this.unescape(title))
        const keys = titles.map((title) => {
            if (title.startsWith('=')) {
                return ''
            }
            const column = dataColumns.find((c) => c.title === title)
            if (!column) {
                return this.fail(`una fila de títulos con: ${dataColumns.map((c) => c.title).join(' | ')}`)
            }
            return column.key
        })
        for (const column of dataColumns) {
            if (keys.filter((key) => key === column.key).length !== 1) {
                this.fail(`la columna «${column.title}» una vez en la fila de títulos`)
            }
        }
        this.columns = keys
    }

    /**
     * Lee una fila de la tabla actual, sin las celdas calculadas y sin escapes.
     * @returns El valor de cada celda, por clave de columna.
     * @throws {ParseError} Si no tiene tantas celdas como columnas o lleva un escape no válido.
     */
    cells(): Record<string, string> {
        const cells = this.#split(this.next())
        if (cells.length !== this.columns.length) {
            this.fail(`${this.columns.length} celdas separadas por «|»`)
        }
        const values: Record<string, string> = {}
        this.columns.forEach((key, i) => {
            if (key) {
                values[key] = this.unescape(cells[i])
            }
        })
        return values
    }

    /**
     * Lanza el error de la línea actual.
     * @param expected Lo que se esperaba.
     * @throws {ParseError} Siempre.
     */
    fail(expected: string): never {
        throw new ParseError(this.lineNumber, this.#lines[this.lineNumber - 1] ?? '', expected)
    }

    /**
     * Quita los escapes de un campo: `\|` → `|`, `\,` → `,` y `\\` → `\`.
     * @param text Campo escapado.
     * @returns El campo sin escapes.
     * @throws {ParseError} Si hay otro escape.
     */
    private unescape(text: string): string {
        return text.replace(/\\(.?)/g, (_, escaped: string) => {
            if (escaped === '' || !'|,\\'.includes(escaped)) {
                return this.fail('solo los escapes \\|, \\, y \\\\')
            }
            return escaped
        })
    }

    /**
     * Separa una fila en celdas por los «|» sin escapar, con los escapes aún puestos y sin espacios en los extremos.
     * @param line Fila.
     * @returns Las celdas.
     */
    #split(line: string): string[] {
        const cells = ['']
        for (let i = 0; i < line.length; i++) {
            if (line[i] === '|') {
                cells.push('')
            } else {
                // Un escape pasa entero a la celda, para que «\|» no separe.
                const part = line[i] === '\\' ? line.slice(i, i + 2) : line[i]
                cells[cells.length - 1] += part
                i += part.length - 1
            }
        }
        return cells.map((cell) => cell.trim())
    }
}

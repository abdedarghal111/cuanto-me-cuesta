/**
 * @file Sección de una hoja: un bloque con título, sus líneas de gasto y sus recargos, y sus cuentas.
 */

import { Category } from './Category.ts'
import { Line } from './Line.ts'
import type { Observable } from './Observable.ts'
import type { Serializable } from './Serializable.ts'
import type { SerializableClass } from './SerializableClass.ts'
import { Surcharge } from './Surcharge.ts'
import { Delimiter } from './text/Delimiter.ts'
import type { DocumentReader } from './text/DocumentReader.ts'
import { formatEuros } from './text/numbers.ts'
import { Table } from './text/Table.ts'

/**
 * Si la siguiente línea del lector es una fila de tabla (no un título ni el final).
 * @param reader Lector de la hoja.
 * @returns `true` si es una fila.
 */
const atRow = (reader: DocumentReader) => !(reader.peek()?.startsWith('#') ?? true)

/**
 * Comprueba que `next` tiene los mismos elementos que `current` en otro orden.
 * @param current Elementos actuales.
 * @param next Elementos en el orden nuevo.
 * @throws {Error} Si no son los mismos.
 */
function assertReorder<T>(current: T[], next: T[]): void {
    if (next.length !== current.length || new Set(next).size !== next.length || !next.every((item) => current.includes(item))) {
        throw new Error('Solo se puede cambiar el orden: tienen que ser los mismos elementos.')
    }
}

/** Sección `## Título`. Avisa de sus cambios y de los de sus líneas y recargos. */
export class Section implements Serializable, Observable {
    #title: string
    #lines: Line[] = []
    #surcharges: Surcharge[] = []
    /** Función que deja de escuchar a cada línea o recargo. */
    #unsubscribers = new Map<Line | Surcharge, () => void>()
    #listeners = new Set<() => void>()

    /**
     * Crea una sección vacía.
     * @param title Título de la sección.
     */
    constructor(title: string) {
        this.#title = title
    }

    /** Título de la sección. */
    get title(): string {
        return this.#title
    }

    set title(title: string) {
        this.#title = title
        this.notify()
    }

    /** Líneas de gasto, en orden. Asignar el array solo cambia el orden: tiene que llevar las mismas líneas. */
    get lines(): Line[] {
        return this.#lines
    }

    set lines(lines: Line[]) {
        assertReorder(this.#lines, lines)
        this.#lines = [...lines]
        this.notify()
    }

    /** Recargos de la sección, en orden. Asignar el array solo cambia el orden: tiene que llevar los mismos recargos. */
    get surcharges(): Surcharge[] {
        return this.#surcharges
    }

    set surcharges(surcharges: Surcharge[]) {
        assertReorder(this.#surcharges, surcharges)
        this.#surcharges = [...surcharges]
        this.notify()
    }

    /**
     * Añade una línea al final y escucha sus cambios.
     * @param line Línea nueva.
     */
    addLine(line: Line): void {
        this.#lines.push(line)
        this.#unsubscribers.set(line, line.subscribe(() => this.notify()))
        this.notify()
    }

    /**
     * Quita una línea y deja de escucharla.
     * @param line Línea de la sección.
     * @throws {Error} Si la línea no es de la sección.
     */
    removeLine(line: Line): void {
        this.#remove(this.#lines, line)
    }

    /**
     * Añade un recargo al final y escucha sus cambios.
     * @param surcharge Recargo de la sección (`global` a `false`).
     */
    addSurcharge(surcharge: Surcharge): void {
        this.#surcharges.push(surcharge)
        this.#unsubscribers.set(surcharge, surcharge.subscribe(() => this.notify()))
        this.notify()
    }

    /**
     * Quita un recargo y deja de escucharlo.
     * @param surcharge Recargo de la sección.
     * @throws {Error} Si el recargo no es de la sección.
     */
    removeSurcharge(surcharge: Surcharge): void {
        this.#remove(this.#surcharges, surcharge)
    }

    /**
     * Base de la sección.
     * @returns La suma de las líneas que cuentan.
     */
    base(): number {
        return this.lines.filter((line) => line.counts).reduce((sum, line) => sum + line.cost(), 0)
    }

    /**
     * Subtotal de la sección.
     * @returns La base más los recargos que cuentan.
     */
    subtotal(): number {
        const base = this.base()
        return this.surcharges.filter((s) => s.counts).reduce((sum, s) => sum + s.amount(base), base)
    }

    /**
     * Reparto por categoría de las líneas y recargos que cuentan; lo que no tiene categoría va a «Sin categoría».
     * @returns El importe de cada categoría, en orden de aparición.
     */
    byCategory(): Map<string, number> {
        const result = new Map<string, number>()
        const base = this.base()
        const amounts = [
            ...this.lines.map((line) => [line, line.cost()] as const),
            ...this.surcharges.map((s) => [s, s.amount(base)] as const),
        ]
        for (const [item, amount] of amounts) {
            if (item.counts) {
                const category = item.category.trim() || Category.UNTAGGED
                result.set(category, (result.get(category) ?? 0) + amount)
            }
        }
        return result
    }

    /**
     * Lo que no cuenta.
     * @returns La suma de las líneas y recargos que no cuentan.
     */
    excluded(): number {
        const base = this.base()
        const lines = this.lines.filter((line) => !line.counts).reduce((sum, line) => sum + line.cost(), 0)
        return this.surcharges.filter((s) => !s.counts).reduce((sum, s) => sum + s.amount(base), lines)
    }

    /**
     * Categorías que usan las líneas y los recargos.
     * @returns Las categorías, sin repetir y en orden de aparición.
     */
    usedCategories(): string[] {
        return [...new Set([...this.lines, ...this.surcharges].map((item) => item.category.trim()).filter(Boolean))]
    }

    /**
     * Categoría de la última línea, la que llevan las líneas y recargos que se añaden detrás.
     * @returns La categoría de la última línea, o `''` si la sección no tiene líneas.
     */
    lastCategory(): string {
        return this.#lines.at(-1)?.category ?? ''
    }

    /**
     * Escribe la sección: su título con el subtotal, la tabla de líneas y, si hay recargos, su tabla.
     * @returns Líneas de texto, terminadas en una línea en blanco.
     */
    serialize(): string[] {
        const base = this.base()
        const title = Table.escape(this.#title) || 'Sin título'
        const lines = new Table(Line.COLUMNS)
        for (const line of this.lines) {
            lines.addRow([...line.serialize(), `= ${formatEuros(line.cost())}`])
        }
        const text = [`${Delimiter.SECTION} ${title} (= subtotal ${formatEuros(this.subtotal())})`, ...lines.render(), '']
        if (this.surcharges.length) {
            const surcharges = new Table(Surcharge.columns(false))
            for (const surcharge of this.surcharges) {
                surcharges.addRow([...surcharge.serialize(), `= ${formatEuros(surcharge.amount(base))}`])
            }
            text.push(`${Delimiter.SURCHARGES} (= base ${formatEuros(base)})`, ...surcharges.render(), '')
        }
        return text
    }

    /**
     * Copia la sección con copias de sus líneas y recargos, sin sus suscripciones.
     * @returns La copia.
     */
    clone(): Section {
        const copy = new Section(this.#title)
        for (const line of this.lines) {
            copy.addLine(line.clone())
        }
        for (const surcharge of this.surcharges) {
            copy.addSurcharge(surcharge.clone())
        }
        return copy
    }

    /**
     * Suscribe una función a los cambios de la sección y de sus filas.
     * @param listener Función que se llama en cada cambio.
     * @returns Función que anula la suscripción.
     */
    subscribe(listener: () => void): () => void {
        this.#listeners.add(listener)
        return () => {
            this.#listeners.delete(listener)
        }
    }

    /** Avisa a los suscritos de que la sección ha cambiado. */
    notify(): void {
        for (const listener of this.#listeners) {
            listener()
        }
    }

    /**
     * Crea una sección con una línea en blanco, lista para rellenar.
     * @param title Título de la sección.
     * @returns La sección nueva.
     */
    static blank(title: string): Section {
        const section = new Section(title)
        section.addLine(new Line())
        return section
    }

    /**
     * Lee una sección: `## Título`, su tabla de líneas y, si la hay, `### Recargos` con su tabla.
     * @param reader Lector de la hoja, situado en el título.
     * @returns La sección.
     */
    static deserialize(reader: DocumentReader): Section {
        const section = new Section(reader.heading(Delimiter.SECTION))
        reader.readColumns(Line.COLUMNS)
        while (atRow(reader)) {
            section.addLine(Line.deserialize(reader))
        }
        if (reader.atHeading(Delimiter.SURCHARGES)) {
            reader.heading(Delimiter.SURCHARGES)
            reader.readColumns(Surcharge.columns(false))
            while (atRow(reader)) {
                section.addSurcharge(Surcharge.deserialize(reader, false))
            }
        }
        return section
    }

    /**
     * Quita un elemento de una de las listas, deja de escucharlo y avisa.
     * @param list Lista de la sección.
     * @param item Elemento que se quita.
     * @throws {Error} Si el elemento no está en la lista.
     */
    #remove<T extends Line | Surcharge>(list: T[], item: T): void {
        const index = list.indexOf(item)
        if (index < 0) {
            throw new Error('Ese elemento no es de esta sección.')
        }
        list.splice(index, 1)
        this.#unsubscribers.get(item)?.()
        this.#unsubscribers.delete(item)
        this.notify()
    }
}

Section satisfies SerializableClass<Section>

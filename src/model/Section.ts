/**
 * @file Sección de una hoja: su título, sus líneas de gasto y sus recargos, y sus cuentas. Un grupo
 * función es una sección con datos de entrada, que no suma por sí sola y que calculan las líneas que la llaman.
 */

import { Category } from './Category.ts'
import { type Args, Line } from './Line.ts'
import type { Observable } from './Observable.ts'
import type { Serializable } from './Serializable.ts'
import type { SerializableClass } from './SerializableClass.ts'
import { Surcharge } from './Surcharge.ts'
import { Delimiter } from './text/Delimiter.ts'
import type { DocumentReader } from './text/DocumentReader.ts'
import { formatEuros, formatNumber, parseNumber } from './text/numbers.ts'
import { Table } from './text/Table.ts'

/** Marca que va delante del título de un grupo función. */
const FUNCTION_MARK = 'ƒ'

/** Título de un grupo función: «ƒ Nombre (dato, dato)». */
const FUNCTION_TITLE = /^ƒ\s*(.*?)\s*\(([^()]*)\)$/

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

/** Sección `## Título`, o `## ƒ Título (datos)` si es un grupo función. Avisa de sus cambios y de los de sus filas. */
export class Section implements Serializable, Observable {
    #title: string
    /** Datos de entrada si es un grupo función; si no, `null`. */
    #params: string[] | null = null
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

    /** Si es un grupo función. */
    get isFunction(): boolean {
        return this.#params !== null
    }

    /** Datos de entrada del grupo función, en orden; vacío si no lo es. Se cambian con los métodos de `CostSheet`. */
    get params(): string[] {
        return this.#params ?? []
    }

    /**
     * Cambia los datos de entrada sin tocar las líneas y avisa. Interno: lo usa `CostSheet`.
     * @param params Datos nuevos.
     */
    setParams(params: string[]): void {
        this.#params = [...params]
        this.notify()
    }

    /**
     * Si un dato se gasta por tiempo: lo usa como Cantidad alguna línea que se gasta por duraciones.
     * @param param Nombre del dato.
     * @returns `true` si es de tiempo.
     */
    isTimeParam(param: string): boolean {
        return this.lines.some((line) => line.quantity.trim() === param && line.timeUnit() !== null)
    }

    /**
     * Fórmula del grupo función, para leerla: lo que suma cada dato por unidad, lo fijo y el % de sus recargos.
     * @returns La fórmula («tiempo × 0,128 €/h + gramos × 0,02 €/g + 15 %»).
     */
    formula(): string {
        const zeros = Object.fromEntries(this.params.map((param) => [param, '0']))
        const fixed = this.base(zeros)
        const terms = this.params.map((param) => {
            const time = this.isTimeParam(param)
            const rate = this.base({ ...zeros, [param]: time ? '1h' : '1' }) - fixed
            const unit = time ? 'h' : (this.lines.find((line) => line.quantity.trim() === param)?.unitLabel() ?? 'ud')
            return `${param} × ${formatNumber(rate)} €/${unit}`
        })
        if (fixed !== 0 || !terms.length) {
            terms.push(formatEuros(fixed))
        }
        const percent = this.surcharges.filter((s) => s.counts).reduce((sum, s) => sum + (parseNumber(s.percent) ?? 0), 0)
        if (percent) {
            terms.push(`${formatNumber(percent)} %`)
        }
        return terms.join(' + ')
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
     * @param args Datos de entrada, si es un grupo función.
     * @returns La suma de las líneas que cuentan.
     */
    base(args?: Args): number {
        return this.lines.filter((line) => line.counts).reduce((sum, line) => sum + line.cost(args), 0)
    }

    /**
     * Subtotal de la sección; en un grupo función, el total de una unidad con esos datos.
     * @param args Datos de entrada, si es un grupo función.
     * @returns La base más los recargos que cuentan.
     */
    subtotal(args?: Args): number {
        const base = this.base(args)
        return this.surcharges.filter((s) => s.counts).reduce((sum, s) => sum + s.amount(base), base)
    }

    /**
     * Reparto por categoría de las líneas y recargos que cuentan; lo que no tiene categoría va a «Sin categoría».
     * @param args Datos de entrada, si es un grupo función.
     * @returns El importe de cada categoría, en orden de aparición.
     */
    byCategory(args?: Args): Map<string, number> {
        const result = new Map<string, number>()
        const add = (category: string, amount: number) => {
            const key = category.trim() || Category.UNTAGGED
            result.set(key, (result.get(key) ?? 0) + amount)
        }
        const base = this.base(args)
        for (const line of this.lines.filter((l) => l.counts)) {
            for (const [category, amount] of line.byCategory(args)) {
                add(category, amount)
            }
        }
        for (const surcharge of this.surcharges.filter((s) => s.counts)) {
            add(surcharge.category, surcharge.amount(base))
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
     * Escribe la sección: su título con el subtotal (o la fórmula, si es un grupo función), la tabla de líneas y,
     * si hay recargos, su tabla. En un grupo función, el coste de cada línea es el de una unidad de su dato.
     * @returns Líneas de texto, terminadas en una línea en blanco.
     */
    serialize(): string[] {
        const base = this.base()
        const title = Table.escape(this.#title) || 'Sin título'
        const lines = new Table(Line.COLUMNS)
        for (const line of this.lines) {
            const cost = this.isFunction ? `${formatNumber(line.unitPrice())} €/${line.unitLabel()}` : formatEuros(line.cost())
            lines.addRow([...line.serialize(), `= ${cost}`])
        }
        const heading = this.isFunction
            ? `${Delimiter.SECTION} ${FUNCTION_MARK} ${title} (${this.params.join(', ')}) (= ${this.formula()})`
            : `${Delimiter.SECTION} ${title} (= subtotal ${formatEuros(this.subtotal())})`
        const text = [heading, ...lines.render(), '']
        if (this.surcharges.length) {
            const surcharges = new Table(Surcharge.columns(false))
            for (const surcharge of this.surcharges) {
                const cost = this.isFunction ? 'en cada unidad' : formatEuros(surcharge.amount(base))
                surcharges.addRow([...surcharge.serialize(), `= ${cost}`])
            }
            const computed = this.isFunction ? 'sobre cada unidad' : `base ${formatEuros(base)}`
            text.push(`${Delimiter.SURCHARGES} (= ${computed})`, ...surcharges.render(), '')
        }
        return text
    }

    /**
     * Copia la sección con copias de sus líneas y recargos, sin sus suscripciones.
     * @returns La copia.
     */
    clone(): Section {
        const copy = new Section(this.#title)
        copy.#params = this.#params && [...this.#params]
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
     * Crea un grupo función con un dato y una línea en blanco que lo usa como Cantidad.
     * @param title Título del grupo.
     * @returns El grupo nuevo.
     */
    static blankFunction(title: string): Section {
        const section = Section.blank(title)
        section.#params = ['dato']
        section.lines[0].quantity = 'dato'
        return section
    }

    /**
     * Lee una sección: `## Título`, su tabla de líneas y, si la hay, `### Recargos` con su tabla.
     * @param reader Lector de la hoja, situado en el título.
     * @returns La sección.
     */
    static deserialize(reader: DocumentReader): Section {
        const heading = reader.heading(Delimiter.SECTION)
        const fn = heading.startsWith(FUNCTION_MARK) ? heading.match(FUNCTION_TITLE) : null
        if (heading.startsWith(FUNCTION_MARK) && !fn) {
            reader.fail('«## ƒ Título (dato, dato)» en un grupo función')
        }
        const section = new Section(fn ? fn[1] : heading)
        if (fn) {
            section.#params = fn[2].split(',').map((param) => param.trim()).filter(Boolean)
        }
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

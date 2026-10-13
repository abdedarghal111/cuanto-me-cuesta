/**
 * @file Hoja de costes: nombre, fecha, categorías, observaciones, secciones y recargos sobre el total,
 * con sus cuentas y su lectura y escritura como texto.
 */

import { Category } from './Category.ts'
import type { LineItem } from './LineItem.ts'
import type { Observable } from './Observable.ts'
import { Section } from './Section.ts'
import type { Serializable } from './Serializable.ts'
import type { SerializableClass } from './SerializableClass.ts'
import { Summary, type SurchargeTotal } from './Summary.ts'
import { Surcharge } from './Surcharge.ts'
import { Column } from './text/Column.ts'
import { Delimiter } from './text/Delimiter.ts'
import type { DocumentReader } from './text/DocumentReader.ts'
import { SHEET_INSTRUCTIONS } from './text/instructions.ts'
import { formatEuros, formatPercent } from './text/numbers.ts'
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

/**
 * Hoja de costes: un archivo `titulo_fecha.txt`. Avisa de sus cambios y de los de todo lo que contiene, y es la
 * fuente de verdad de las categorías.
 */
export class CostSheet implements Serializable, Observable {
    /** Normas que se escriben al final de cada hoja, tras «# Instrucciones». */
    static readonly INSTRUCTIONS: string[] = SHEET_INSTRUCTIONS

    #name = ''
    #date = ''
    #description = ''
    #categories: string[] = []
    #sections: Section[] = []
    #totalSurcharges: Surcharge[] = []
    /** Función que deja de escuchar a cada sección o recargo sobre el total. */
    #unsubscribers = new Map<Section | Surcharge, () => void>()
    #listeners = new Set<() => void>()

    /** Nombre de la hoja. */
    get name(): string {
        return this.#name
    }

    set name(name: string) {
        this.#name = name
        this.notify()
    }

    /** Fecha, como AAAA-MM-DD; forma parte del nombre del archivo. */
    get date(): string {
        return this.#date
    }

    set date(date: string) {
        this.#date = date
        this.notify()
    }

    /** Observaciones: texto libre de varias líneas. */
    get description(): string {
        return this.#description
    }

    set description(description: string) {
        this.#description = description
        this.notify()
    }

    /** Categorías declaradas en «Categorías:». Se cambian con `addCategory` y `removeCategory`. */
    get categories(): string[] {
        return this.#categories
    }

    /** Secciones, en orden. Asignar el array solo cambia el orden: tiene que llevar las mismas secciones. */
    get sections(): Section[] {
        return this.#sections
    }

    set sections(sections: Section[]) {
        assertReorder(this.#sections, sections)
        this.#sections = [...sections]
        this.notify()
    }

    /**
     * Recargos sobre el total, que se aplican en orden. Asignar el array solo cambia el orden: tiene que llevar los
     * mismos recargos.
     */
    get totalSurcharges(): Surcharge[] {
        return this.#totalSurcharges
    }

    set totalSurcharges(totalSurcharges: Surcharge[]) {
        assertReorder(this.#totalSurcharges, totalSurcharges)
        this.#totalSurcharges = [...totalSurcharges]
        this.notify()
    }

    /**
     * Añade una sección al final, declara las categorías que traiga y escucha sus cambios.
     * @param section Sección nueva.
     */
    addSection(section: Section): void {
        this.#categories = [...new Set([...this.#categories, ...section.usedCategories()])]
        this.#sections.push(section)
        this.#unsubscribers.set(section, section.subscribe(() => this.notify()))
        this.notify()
    }

    /**
     * Quita una sección y deja de escucharla.
     * @param section Sección de la hoja.
     * @throws {Error} Si la sección no es de la hoja.
     */
    removeSection(section: Section): void {
        this.#remove(this.#sections, section)
    }

    /**
     * Añade un recargo sobre el total al final y escucha sus cambios.
     * @param surcharge Recargo sobre el total (`global` a `true`).
     */
    addTotalSurcharge(surcharge: Surcharge): void {
        this.#totalSurcharges.push(surcharge)
        this.#unsubscribers.set(surcharge, surcharge.subscribe(() => this.notify()))
        this.notify()
    }

    /**
     * Quita un recargo sobre el total y deja de escucharlo.
     * @param surcharge Recargo sobre el total de la hoja.
     * @throws {Error} Si el recargo no es de la hoja.
     */
    removeTotalSurcharge(surcharge: Surcharge): void {
        this.#remove(this.#totalSurcharges, surcharge)
    }

    /**
     * Declara una categoría, limpia, si aún no está.
     * @param category Categoría nueva.
     * @throws {Error} Si queda vacía.
     */
    addCategory(category: string): void {
        const clean = Category.clean(category)
        if (!clean) {
            throw new Error('La categoría no puede estar vacía.')
        }
        if (!this.#categories.includes(clean)) {
            this.#categories = [...this.#categories, clean]
            this.notify()
        }
    }

    /**
     * Quita una categoría y deja sin categoría a las líneas y recargos que la usaban.
     * @param category Categoría declarada.
     */
    removeCategory(category: string): void {
        this.#categories = this.#categories.filter((c) => c !== category)
        for (const item of this.itemsInCategory(category)) {
            item.setCategory('')
        }
        this.notify()
    }

    /**
     * Líneas y recargos que usan una categoría: los de las secciones y los recargos sobre el total.
     * @param category Categoría, tal cual la lleva cada línea o recargo.
     * @returns Las líneas y recargos, en orden de aparición.
     */
    itemsInCategory(category: string): LineItem[] {
        return [
            ...this.#sections.flatMap((section) => [...section.lines, ...section.surcharges]),
            ...this.#totalSurcharges,
        ].filter((item) => item.category === category)
    }

    /**
     * Pone la categoría a una línea o un recargo. Es la única forma de hacerlo.
     * @param item Línea o recargo.
     * @param category Una de `categories`, o vacía para «Sin categoría».
     * @throws {Error} Si la categoría no está declarada.
     */
    assignCategory(item: LineItem, category: string): void {
        const clean = Category.clean(category)
        if (clean && !this.#categories.includes(clean)) {
            throw new Error(`La categoría «${clean}» no está en la hoja.`)
        }
        item.setCategory(clean)
    }

    /**
     * Coste de la hoja.
     * @returns La suma de los subtotales de las secciones.
     */
    cost(): number {
        return this.sections.reduce((sum, section) => sum + section.subtotal(), 0)
    }

    /**
     * Total de la hoja.
     * @returns El coste con los recargos sobre el total aplicados en orden.
     */
    total(): number {
        return this.#totalSurchargeAmounts().at(-1)?.runningTotal ?? this.cost()
    }

    /**
     * Reparto por categoría de las secciones y de los recargos sobre el total que cuentan.
     * @returns El importe de cada categoría, en orden de aparición.
     */
    byCategory(): Map<string, number> {
        const result = new Map<string, number>()
        const add = (category: string, amount: number) => {
            const key = category.trim() || Category.UNTAGGED
            result.set(key, (result.get(key) ?? 0) + amount)
        }
        for (const section of this.sections) {
            for (const [category, amount] of section.byCategory()) {
                add(category, amount)
            }
        }
        const amounts = this.#totalSurchargeAmounts()
        this.totalSurcharges.forEach((surcharge, i) => {
            if (surcharge.counts) {
                add(surcharge.category, amounts[i].amount)
            }
        })
        return result
    }

    /**
     * Lo que no cuenta en las secciones. Los recargos sobre el total que no cuentan no se suman aquí.
     * @returns La suma de las líneas y recargos de las secciones que no cuentan.
     */
    excluded(): number {
        return this.sections.reduce((sum, section) => sum + section.excluded(), 0)
    }

    /**
     * Categorías que usan las secciones y los recargos sobre el total.
     * @returns Las categorías, sin repetir y en orden de aparición.
     */
    usedCategories(): string[] {
        return [
            ...new Set([
                ...this.sections.flatMap((section) => section.usedCategories()),
                ...this.totalSurcharges.map((s) => s.category.trim()).filter(Boolean),
            ]),
        ]
    }

    /**
     * Calcula las cuentas de la hoja.
     * @returns El resumen.
     */
    summarize(): Summary {
        return new Summary({
            total: this.total(),
            cost: this.cost(),
            byCategory: this.byCategory(),
            totalSurcharges: this.#totalSurchargeAmounts(),
            excluded: this.excluded(),
        })
    }

    /**
     * Nombre de archivo de la hoja: "Paralelas Tomás" + "2026-10-04" → "paralelas-tomas_2026-10-04.txt".
     * @param suffix Texto que se añade al nombre para no repetir archivo.
     * @returns El nombre del archivo.
     */
    fileName(suffix = ''): string {
        const base = `${this.#name} ${suffix}`
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
        return `${base || 'producto'}_${this.#date}.txt`
    }

    /**
     * Copia la hoja con copias de sus secciones y recargos, sin sus suscripciones.
     * @returns La copia.
     */
    clone(): CostSheet {
        const copy = new CostSheet()
        copy.#name = this.#name
        copy.#date = this.#date
        copy.#description = this.#description
        copy.#categories = [...this.#categories]
        for (const section of this.sections) {
            copy.addSection(section.clone())
        }
        for (const surcharge of this.totalSurcharges) {
            copy.addTotalSurcharge(surcharge.clone())
        }
        return copy
    }

    /**
     * Escribe la hoja completa: cabecera, observaciones, secciones, recargos sobre el total, resumen e instrucciones.
     * @returns Líneas de texto; unidas con saltos de línea, el texto acaba en uno.
     */
    serialize(): string[] {
        const summary = this.summarize()
        const description = this.#description ? this.#description.split(/\r?\n/) : []
        // La valla del bloque es más larga que cualquier línea de solo comillas del texto.
        const longest = Math.max(2, ...description.filter((line) => /^`{3,}\s*$/.test(line)).map((line) => line.trim().length))
        const fence = '`'.repeat(longest + 1)
        const text = [
            `${Delimiter.SHEET} ${Table.escape(this.#name) || 'Sin nombre'}`,
            `Fecha: ${this.#date}`,
            `Categorías: ${Category.formatList(this.#categories)}`,
            '',
            `${fence}${Delimiter.OBSERVATIONS}`,
            ...description,
            fence,
            '',
            ...this.sections.flatMap((section) => section.serialize()),
        ]
        if (this.totalSurcharges.length) {
            const table = new Table(Surcharge.columns(true))
            this.totalSurcharges.forEach((surcharge, i) => {
                const { amount, runningTotal } = summary.totalSurcharges[i]
                table.addRow([...surcharge.serialize(), `= ${formatEuros(amount)}`, `= ${formatEuros(runningTotal)}`])
            })
            text.push(
                `${Delimiter.TOTAL} (= coste ${formatEuros(summary.cost)} → total ${formatEuros(summary.total)})`,
                ...table.render(),
                '',
            )
        }
        const resumen = new Table([new Column('', 'category'), new Column('', 'amount', true), new Column('', 'percent', true)], '   ')
        for (const [category, amount] of summary.byCategory) {
            resumen.addRow([category, formatEuros(amount), summary.total > 0 ? formatPercent((amount / summary.total) * 100) : ''])
        }
        resumen.addRow(['TOTAL', formatEuros(summary.total), ''])
        if (summary.excluded > 0) {
            resumen.addRow(['(no cuenta)', formatEuros(summary.excluded), ''])
        }
        text.push(
            Delimiter.SUMMARY,
            ...resumen.render(),
            `Guardado: ${new Date().toLocaleString('es-ES')}`,
            '',
            Delimiter.INSTRUCTIONS,
            ...CostSheet.INSTRUCTIONS,
            '',
        )
        return text
    }

    /**
     * Suscribe una función a los cambios de la hoja y de todo lo que contiene.
     * @param listener Función que se llama en cada cambio.
     * @returns Función que anula la suscripción.
     */
    subscribe(listener: () => void): () => void {
        this.#listeners.add(listener)
        return () => {
            this.#listeners.delete(listener)
        }
    }

    /** Avisa a los suscritos de que la hoja ha cambiado. */
    notify(): void {
        for (const listener of this.#listeners) {
            listener()
        }
    }

    /**
     * Lee una hoja completa hasta «# Resumen» o el final del texto.
     * @param reader Lector situado al principio del texto.
     * @returns La hoja.
     */
    static deserialize(reader: DocumentReader): CostSheet {
        const sheet = new CostSheet()
        sheet.#name = reader.heading(Delimiter.SHEET)
        sheet.#date = reader.expect(/^Fecha:\s*(\d{4}-\d{2}-\d{2})\s*$/, '«Fecha: AAAA-MM-DD»')[1]
        const categories = reader.expect(/^Categorías:(.*)$/, '«Categorías:» con las categorías separadas por comas')[1]
        try {
            sheet.#categories = Category.parseList(categories)
        } catch {
            reader.fail('en Categorías solo los escapes \\, \\| y \\\\')
        }
        reader.categories = sheet.#categories
        sheet.#description = reader.readBlock(Delimiter.OBSERVATIONS)
        while (reader.atHeading(Delimiter.SECTION)) {
            sheet.addSection(Section.deserialize(reader))
        }
        if (reader.atHeading(Delimiter.TOTAL)) {
            reader.heading(Delimiter.TOTAL)
            reader.readColumns(Surcharge.columns(true))
            while (atRow(reader)) {
                sheet.addTotalSurcharge(Surcharge.deserialize(reader, true))
            }
        }
        if (reader.peek() !== undefined && !reader.atHeading(Delimiter.SUMMARY)) {
            reader.fail('«## Título», «# Sobre el total» o «# Resumen»')
        }
        return sheet
    }

    /**
     * Quita un elemento de una de las listas, deja de escucharlo y avisa.
     * @param list Lista de la hoja.
     * @param item Elemento que se quita.
     * @throws {Error} Si el elemento no está en la lista.
     */
    #remove<T extends Section | Surcharge>(list: T[], item: T): void {
        const index = list.indexOf(item)
        if (index < 0) {
            throw new Error('Ese elemento no es de esta hoja.')
        }
        list.splice(index, 1)
        this.#unsubscribers.get(item)?.()
        this.#unsubscribers.delete(item)
        this.notify()
    }

    /** Importe de cada recargo sobre el total y lo acumulado tras él; los que no cuentan no se acumulan. */
    #totalSurchargeAmounts(): SurchargeTotal[] {
        let runningTotal = this.cost()
        return this.totalSurcharges.map((surcharge) => {
            const amount = surcharge.amount(runningTotal)
            if (surcharge.counts) {
                runningTotal += amount
            }
            return { amount, runningTotal }
        })
    }
}

CostSheet satisfies SerializableClass<CostSheet>

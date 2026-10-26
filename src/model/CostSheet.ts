/**
 * @file Hoja de costes: nombre, fecha, categorías, observaciones, secciones y recargos sobre el total,
 * con sus cuentas y su lectura y escritura como texto.
 */

import { Category } from './Category.ts'
import type { Line } from './Line.ts'
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
 * Nombre de un dato de receta sin lo que rompe su escritura en el título (comas, paréntesis y «·»).
 * @param name Nombre tal cual se escribe.
 * @returns El nombre limpio, vacío si no queda nada.
 */
const cleanParam = (name: string) => name.replace(/[,()·]/g, ' ').trim()

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
     * Secciones que suman: las que no son recetas. Asignar el array solo cambia su orden entre ellas: tiene que
     * llevar las mismas secciones.
     */
    get groups(): Section[] {
        return this.#sections.filter((section) => !section.isFunction)
    }

    set groups(groups: Section[]) {
        this.#reorderKind(groups, false)
    }

    /**
     * Recetas (grupos función), que no suman por sí solas. Asignar el array solo cambia su orden entre ellas: tiene
     * que llevar las mismas recetas.
     */
    get functions(): Section[] {
        return this.#sections.filter((section) => section.isFunction)
    }

    set functions(functions: Section[]) {
        this.#reorderKind(functions, true)
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
     * Añade una sección al final, declara las categorías que traiga y escucha sus cambios. Sus líneas de tipo
     * función pasan a llamar al grupo de esta hoja con el mismo título; si no lo hay, se añade antes una copia del
     * suyo (p. ej. al añadir una sección de otra hoja).
     * @param section Sección nueva.
     */
    addSection(section: Section): void {
        for (const line of section.lines) {
            const fn = line.function
            if (fn && !this.#sections.includes(fn)) {
                const own = this.functions.find((f) => f.title === fn.title)
                if (own) {
                    line.call(own)
                } else {
                    const copy = fn.clone()
                    this.addSection(copy)
                    line.call(copy)
                }
            }
        }
        this.#attach(section)
    }

    /**
     * Quita una sección y deja de escucharla. Si es un grupo función, las líneas que lo llaman pasan a fijo.
     * @param section Sección de la hoja.
     * @throws {Error} Si la sección no es de la hoja.
     */
    removeSection(section: Section): void {
        for (const line of this.callers(section)) {
            line.type = 'fixed'
        }
        this.#remove(this.#sections, section)
    }

    /**
     * Añade una copia de una sección justo debajo de ella. Sus líneas llaman a las mismas recetas.
     * @param section Sección de la hoja que no es una receta.
     * @returns La copia.
     * @throws {Error} Si es una receta (dos recetas con el mismo título no se distinguirían al leer).
     */
    cloneSection(section: Section): Section {
        if (section.isFunction) {
            throw new Error('Una receta no se clona.')
        }
        const copy = section.clone()
        this.#attach(copy)
        this.#sections.splice(this.#sections.indexOf(section) + 1, 0, this.#sections.pop()!)
        this.notify()
        return copy
    }

    /**
     * Si una línea se puede llevar a una sección: dentro de la suya, o entre secciones que no son recetas.
     * @param line Línea de la hoja.
     * @param to Sección de destino.
     * @returns `true` si se puede.
     */
    canMoveLine(line: Line, to: Section): boolean {
        const from = this.#sections.find((section) => section.lines.includes(line))
        return from === to || (!!from && !from.isFunction && !to.isFunction)
    }

    /**
     * Lleva una línea a una posición de su sección o de otra (ver `canMoveLine`).
     * @param line Línea de la hoja.
     * @param to Sección de destino.
     * @param index Posición de destino, contada con la línea aún en su sitio.
     * @throws {Error} Si no se puede llevar ahí.
     */
    moveLine(line: Line, to: Section, index: number): void {
        const from = this.#sections.find((section) => section.lines.includes(line))
        if (!from || !this.canMoveLine(line, to)) {
            throw new Error('Esa línea no se puede llevar ahí.')
        }
        if (from === to) {
            const lines = to.lines.filter((l) => l !== line)
            lines.splice(index > to.lines.indexOf(line) ? index - 1 : index, 0, line)
            to.lines = lines
        } else {
            from.removeLine(line)
            to.addLine(line, index)
        }
    }

    /**
     * Líneas que llaman a un grupo función.
     * @param section Grupo función.
     * @returns Las líneas, en orden de aparición.
     */
    callers(section: Section): Line[] {
        return this.#sections.flatMap((s) => s.lines).filter((line) => line.function === section)
    }

    /**
     * Añade un dato de entrada al final de una receta, si cabe (`Section.MAX_PARAMS`).
     * @param section Receta.
     * @param name Nombre del dato; si queda vacío o ya existe, no se añade.
     * @returns El nombre limpio con el que queda, o `null` si no se añade.
     */
    addParam(section: Section, name: string): string | null {
        const clean = cleanParam(name)
        if (!clean || section.params.includes(clean) || section.params.length >= Section.MAX_PARAMS) {
            return null
        }
        section.setParams([...section.params, clean])
        return clean
    }

    /**
     * Cambia el nombre de un dato de un grupo función, y también en sus líneas y en las que lo llaman.
     * @param section Grupo función.
     * @param from Nombre actual.
     * @param to Nombre nuevo; si queda vacío o ya existe, no cambia nada.
     */
    renameParam(section: Section, from: string, to: string): void {
        const name = cleanParam(to)
        if (!name || section.params.includes(name)) {
            return
        }
        section.setParams(section.params.map((param) => (param === from ? name : param)))
        for (const line of section.lines.filter((l) => l.quantity.trim() === from)) {
            line.quantity = name
        }
        for (const line of this.callers(section)) {
            line.renameArg(from, name)
        }
    }

    /**
     * Quita un dato de un grupo función; las líneas que lo usaban como Cantidad quedan con la Cantidad vacía.
     * @param section Grupo función.
     * @param param Nombre del dato.
     */
    removeParam(section: Section, param: string): void {
        section.setParams(section.params.filter((p) => p !== param))
        for (const line of section.lines.filter((l) => l.quantity.trim() === param)) {
            line.quantity = ''
        }
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
     * @param category Categoría nueva, tal cual se escribe.
     * @returns El nombre limpio con el que queda declarada, también si ya estaba, o `null` si queda vacía y no se
     * declara.
     */
    addCategory(category: string): string | null {
        const clean = Category.clean(category)
        if (!clean) {
            return null
        }
        if (!this.#categories.includes(clean)) {
            this.#categories = [...this.#categories, clean]
            this.notify()
        }
        return clean
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
     * @returns La suma de los subtotales de las secciones que suman.
     */
    cost(): number {
        return this.groups.reduce((sum, section) => sum + section.subtotal(), 0)
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
        for (const section of this.groups) {
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
        return this.groups.reduce((sum, section) => sum + section.excluded(), 0)
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
        // Las líneas de tipo función de la copia llaman a las copias de los grupos.
        const map = new Map(this.sections.map((section) => [section, section.clone()]))
        for (const section of map.values()) {
            for (const line of section.lines) {
                line.relink(map)
            }
            copy.#attach(section)
        }
        for (const surcharge of this.totalSurcharges) {
            copy.addTotalSurcharge(surcharge.clone())
        }
        return copy
    }

    /**
     * Crea una hoja nueva a partir de otra: una copia con otro nombre y otra fecha.
     * @param source Hoja de la que se parte (la plantilla u otra hoja).
     * @param name Nombre de la hoja nueva.
     * @param date Fecha de la hoja nueva, como AAAA-MM-DD.
     * @returns La hoja nueva.
     */
    static copy(source: CostSheet, name: string, date: string): CostSheet {
        const sheet = source.clone()
        sheet.#name = name
        sheet.#date = date
        return sheet
    }

    /**
     * Crea una hoja nueva con solo lo elegido de una plantilla: lo elegido cuenta, y se quitan las secciones que
     * quedan sin líneas (salvo las recetas a las que llama alguna línea), las observaciones de la plantilla y las
     * categorías que no usa nada.
     * @param template Plantilla de la que se parte.
     * @param name Nombre de la hoja nueva.
     * @param date Fecha de la hoja nueva, como AAAA-MM-DD.
     * @param keep Si se queda una línea o un recargo de la plantilla.
     * @returns La hoja nueva.
     */
    static fromTemplate(template: CostSheet, name: string, date: string, keep: (item: LineItem) => boolean): CostSheet {
        const sheet = CostSheet.copy(template, name, date)
        sheet.#description = ''
        template.sections.forEach((section, i) => {
            const copy = sheet.#sections[i]
            const lines = [...copy.lines]
            const surcharges = [...copy.surcharges]
            section.lines.forEach((line, j) => (keep(line) ? (lines[j].counts = true) : copy.removeLine(lines[j])))
            section.surcharges.forEach((surcharge, j) => (keep(surcharge) ? (surcharges[j].counts = true) : copy.removeSurcharge(surcharges[j])))
        })
        const totals = [...sheet.#totalSurcharges]
        template.totalSurcharges.forEach((surcharge, j) => (keep(surcharge) ? (totals[j].counts = true) : sheet.removeTotalSurcharge(totals[j])))
        for (const section of [...sheet.#sections]) {
            if (!section.lines.length && !(section.isFunction && sheet.callers(section).length)) {
                sheet.removeSection(section)
            }
        }
        const used = sheet.usedCategories()
        sheet.#categories = sheet.#categories.filter((category) => used.includes(category))
        return sheet
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
            sheet.#attach(Section.deserialize(reader))
        }
        // Las líneas de tipo función se enlazan con su grupo cuando ya se han leído todos; dentro de un grupo
        // función no se puede llamar a otro.
        for (const section of sheet.sections) {
            for (const line of section.lines) {
                line.link(section.isFunction ? [] : sheet.functions, reader)
            }
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

    /**
     * Cambia el orden de las recetas o de las demás secciones entre ellas, sin moverlas de los huecos que ocupan.
     * @param sections Las secciones de esa clase en el orden nuevo.
     * @param isFunction Si son las recetas.
     * @throws {Error} Si no son las mismas secciones.
     */
    #reorderKind(sections: Section[], isFunction: boolean): void {
        assertReorder(this.#sections.filter((section) => section.isFunction === isFunction), sections)
        const queue = [...sections]
        this.#sections = this.#sections.map((section) => (section.isFunction === isFunction ? queue.shift()! : section))
        this.notify()
    }

    /**
     * Añade una sección al final tal cual, declara las categorías que traiga y escucha sus cambios.
     * @param section Sección nueva.
     */
    #attach(section: Section): void {
        this.#categories = [...new Set([...this.#categories, ...section.usedCategories()])]
        this.#sections.push(section)
        this.#unsubscribers.set(section, section.subscribe(() => this.notify()))
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

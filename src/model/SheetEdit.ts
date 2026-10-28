/**
 * @file Órdenes de edición de una hoja, tal como las manda la ventana, y su aplicación al modelo. Los objetos se
 * nombran por su identificador de `IdRegistry`.
 */

import { CostSheet } from './CostSheet.ts'
import type { IdRegistry } from './IdRegistry.ts'
import { Line } from './Line.ts'
import type { LineItem } from './LineItem.ts'
import type { BasicLineType } from './LineType.ts'
import { Section } from './Section.ts'
import { Surcharge } from './Surcharge.ts'

/** Campo que se escribe directamente: de la hoja, de una sección, de una línea o de un recargo. */
export type EditField = 'name' | 'date' | 'description' | 'title' | 'counts' | 'price' | 'size' | 'unit' | 'watts' | 'quantity' | 'percent'

/** Una orden de edición. */
export type SheetEdit =
    /** Escribe un campo de un objeto. */
    | { op: 'set'; id: string; field: EditField; value: string | boolean }
    /** Añade una sección (o una receta) con una línea en blanco. */
    | { op: 'addSection'; title: string; recipe: boolean }
    /** Añade una línea al final de una sección, con la categoría de su última línea. */
    | { op: 'addLine'; sectionId: string; name: string }
    /** Añade un recargo al final de una sección o, con `sectionId` a `null`, sobre el total. */
    | { op: 'addSurcharge'; sectionId: string | null; name: string }
    /** Clona una sección o una línea justo debajo. */
    | { op: 'clone'; id: string }
    /** Sube o baja una sección, una línea o un recargo entre los suyos. */
    | { op: 'move'; id: string; step: -1 | 1 }
    /** Quita una sección, una línea o un recargo. */
    | { op: 'remove'; id: string }
    /** Lleva una línea a una posición de su sección o de otra; con `copy`, añade una copia al final. */
    | { op: 'moveLine'; id: string; sectionId: string; index: number; copy: boolean }
    /** Cambia el tipo de una línea a uno básico. */
    | { op: 'setType'; id: string; type: BasicLineType }
    /** Hace que una línea llame a una receta. */
    | { op: 'callRecipe'; id: string; recipeId: string }
    /** Escribe el valor de un dato de la receta a la que llama una línea. */
    | { op: 'setArg'; id: string; param: string; value: string }
    /** Normaliza la Cantidad de una línea o, con `param`, el valor de ese dato. */
    | { op: 'normalize'; id: string; param?: string }
    | { op: 'addParam'; sectionId: string; name: string }
    | { op: 'renameParam'; sectionId: string; from: string; to: string }
    | { op: 'removeParam'; sectionId: string; param: string }
    /** Declara una categoría y, con `assignTo`, se la pone a esa línea o recargo. */
    | { op: 'addCategory'; name: string; assignTo?: string }
    | { op: 'removeCategory'; name: string }
    | { op: 'assignCategory'; id: string; category: string }

/** Campos que se pueden escribir en cada clase. */
const FIELDS: [new (...args: never[]) => object, EditField[]][] = [
    [CostSheet, ['name', 'date', 'description']],
    [Section, ['title']],
    [Line, ['counts', 'name', 'price', 'size', 'unit', 'watts', 'quantity']],
    [Surcharge, ['counts', 'name', 'percent']],
]

/** Aplica las órdenes de edición. Solo tiene miembros estáticos. */
export class SheetEdits {
    private constructor() {}

    /**
     * Aplica una orden a una hoja.
     * @param sheet Hoja.
     * @param ids Registro de identificadores de la hoja, el de su última foto.
     * @param edit Orden.
     * @returns El objeto creado (sección, línea o recargo), o `null` si la orden no crea nada.
     * @throws {Error} Si la orden no se puede aplicar.
     */
    static apply(sheet: CostSheet, ids: IdRegistry, edit: SheetEdit): object | null {
        const section = (id: string) => SheetEdits.#as(ids.get(id), Section)
        const line = (id: string) => SheetEdits.#as(ids.get(id), Line)
        switch (edit.op) {
            case 'set': {
                const target = ids.get(edit.id)
                const allowed = FIELDS.find(([type]) => target instanceof type)?.[1] ?? []
                if (!allowed.includes(edit.field)) {
                    throw new Error(`No se puede escribir «${edit.field}» ahí.`)
                }
                Reflect.set(target, edit.field, edit.value)
                return null
            }
            case 'addSection': {
                const created = edit.recipe ? Section.blankFunction(edit.title) : Section.blank(edit.title)
                sheet.addSection(created)
                return created
            }
            case 'addLine': {
                const to = section(edit.sectionId)
                const created = new Line()
                created.name = edit.name
                sheet.assignCategory(created, to.lastCategory())
                to.addLine(created)
                return created
            }
            case 'addSurcharge': {
                const to = edit.sectionId === null ? null : section(edit.sectionId)
                const created = new Surcharge(to === null)
                created.name = edit.name
                if (to) {
                    sheet.assignCategory(created, to.lastCategory())
                    to.addSurcharge(created)
                } else {
                    sheet.addTotalSurcharge(created)
                }
                return created
            }
            case 'clone': {
                const target = ids.get(edit.id)
                if (target instanceof Section) {
                    return sheet.cloneSection(target)
                }
                const item = SheetEdits.#as(target, Line)
                return SheetEdits.#sectionOf(sheet, item).cloneLine(item)
            }
            case 'move':
                SheetEdits.#move(sheet, ids.get(edit.id), edit.step)
                return null
            case 'remove':
                SheetEdits.#remove(sheet, ids.get(edit.id))
                return null
            case 'moveLine': {
                const item = line(edit.id)
                const to = section(edit.sectionId)
                if (!sheet.canMoveLine(item, to)) {
                    throw new Error('Esa línea no se puede llevar ahí.')
                }
                if (edit.copy) {
                    const created = item.clone()
                    to.addLine(created)
                    return created
                }
                sheet.moveLine(item, to, edit.index)
                return null
            }
            case 'setType':
                line(edit.id).type = edit.type
                return null
            case 'callRecipe':
                line(edit.id).call(section(edit.recipeId))
                return null
            case 'setArg':
                line(edit.id).setArg(edit.param, edit.value)
                return null
            case 'normalize':
                if (edit.param === undefined) {
                    line(edit.id).normalizeQuantity()
                } else {
                    line(edit.id).normalizeArg(edit.param)
                }
                return null
            case 'addParam':
                sheet.addParam(section(edit.sectionId), edit.name)
                return null
            case 'renameParam':
                sheet.renameParam(section(edit.sectionId), edit.from, edit.to)
                return null
            case 'removeParam':
                sheet.removeParam(section(edit.sectionId), edit.param)
                return null
            case 'addCategory': {
                const name = sheet.addCategory(edit.name)
                if (name !== null && edit.assignTo !== undefined) {
                    sheet.assignCategory(SheetEdits.#item(ids.get(edit.assignTo)), name)
                }
                return null
            }
            case 'removeCategory':
                sheet.removeCategory(edit.name)
                return null
            case 'assignCategory':
                sheet.assignCategory(SheetEdits.#item(ids.get(edit.id)), edit.category)
                return null
        }
    }

    /**
     * Comprueba la clase de un objeto.
     * @throws {Error} Si no es de esa clase.
     */
    static #as<T>(object: object, type: new (...args: never[]) => T): T {
        if (!(object instanceof type)) {
            throw new Error('Ese elemento no es del tipo que pide la orden.')
        }
        return object
    }

    /**
     * Comprueba que un objeto es una línea o un recargo.
     * @throws {Error} Si no lo es.
     */
    static #item(object: object): LineItem {
        if (object instanceof Line || object instanceof Surcharge) {
            return object
        }
        throw new Error('Solo las líneas y los recargos llevan categoría.')
    }

    /**
     * Sección que contiene una línea o un recargo.
     * @returns La sección, o `null` si es un recargo sobre el total.
     * @throws {Error} Si no es de la hoja.
     */
    static #sectionOf(sheet: CostSheet, item: Line): Section
    static #sectionOf(sheet: CostSheet, item: Line | Surcharge): Section | null
    static #sectionOf(sheet: CostSheet, item: Line | Surcharge): Section | null {
        if (item instanceof Surcharge && sheet.totalSurcharges.includes(item)) {
            return null
        }
        const found = sheet.sections.find((s) => (item instanceof Line ? s.lines.includes(item) : s.surcharges.includes(item)))
        if (!found) {
            throw new Error('Ese elemento no es de esta hoja.')
        }
        return found
    }

    /**
     * Lista en la que se ordena un objeto y la función que la vuelve a asignar en otro orden.
     * @returns La lista y su asignación.
     */
    static #list(sheet: CostSheet, target: object): [object[], (list: never[]) => void] {
        if (target instanceof Section) {
            return target.isFunction
                ? [sheet.functions, (list) => (sheet.functions = list)]
                : [sheet.groups, (list) => (sheet.groups = list)]
        }
        if (target instanceof Line) {
            const owner = SheetEdits.#sectionOf(sheet, target)
            return [owner.lines, (list) => (owner.lines = list)]
        }
        const owner = SheetEdits.#sectionOf(sheet, SheetEdits.#as(target, Surcharge))
        return owner
            ? [owner.surcharges, (list) => (owner.surcharges = list)]
            : [sheet.totalSurcharges, (list) => (sheet.totalSurcharges = list)]
    }

    /** Cambia un objeto de sitio con el de al lado; en los extremos no hace nada. */
    static #move(sheet: CostSheet, target: object, step: -1 | 1): void {
        const [list, assign] = SheetEdits.#list(sheet, target)
        const index = list.indexOf(target)
        const other = index + step
        if (other < 0 || other >= list.length) {
            return
        }
        const reordered = [...list]
        ;[reordered[index], reordered[other]] = [reordered[other], reordered[index]]
        assign(reordered as never[])
    }

    /** Quita una sección, una línea o un recargo de donde esté. */
    static #remove(sheet: CostSheet, target: object): void {
        if (target instanceof Section) {
            sheet.removeSection(target)
        } else if (target instanceof Line) {
            SheetEdits.#sectionOf(sheet, target).removeLine(target)
        } else {
            const surcharge = SheetEdits.#as(target, Surcharge)
            const owner = SheetEdits.#sectionOf(sheet, surcharge)
            if (owner) {
                owner.removeSurcharge(surcharge)
            } else {
                sheet.removeTotalSurcharge(surcharge)
            }
        }
    }
}

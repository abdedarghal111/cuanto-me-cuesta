/**
 * @file Foto de una hoja para la ventana: sus datos y todas sus cuentas ya hechas, como objetos simples que se
 * envían de un proceso a otro. Cada objeto lleva su identificador de `IdRegistry`.
 */

import type { CostSheet } from './CostSheet.ts'
import type { IdRegistry } from './IdRegistry.ts'
import type { Line } from './Line.ts'
import type { LineType } from './LineType.ts'
import type { Section } from './Section.ts'
import type { Surcharge } from './Surcharge.ts'

/** Lo común de una línea y un recargo. */
export interface ItemView {
    id: string
    counts: boolean
    name: string
    category: string
}

/** Línea de gasto con su coste. */
export interface LineView extends ItemView {
    type: LineType
    /** Receta a la que llama, si es de tipo función. */
    recipeId: string | null
    price: string
    size: string
    unit: string
    watts: string
    quantity: string
    /** Valor de cada dato de la receta a la que llama. */
    args: Record<string, string>
    /** Unidad de tiempo de la Cantidad (d, h o min), o `null` si es un número. */
    timeUnit: string | null
    /** Unidad en que se cuenta la Cantidad («g», «h», «ud»). */
    unitLabel: string
    unitPrice: number
    cost: number
}

/** Recargo con su importe; sobre el total, también con lo acumulado tras él. */
export interface SurchargeView extends ItemView {
    percent: string
    amount: number
    runningTotal: number
}

/** Sección o receta, con sus filas y sus cuentas. */
export interface SectionView {
    id: string
    title: string
    isFunction: boolean
    params: string[]
    base: number
    subtotal: number
    /** Líneas que llaman a esta receta. */
    callers: number
    lines: LineView[]
    surcharges: SurchargeView[]
}

/** Uso de una categoría declarada: cuántas filas la llevan y lo que suman. */
export interface CategoryUsage {
    name: string
    items: number
    amount: number
}

/** Hoja completa, lista para pintar. */
export interface SheetView {
    id: string
    name: string
    date: string
    description: string
    categories: CategoryUsage[]
    cost: number
    total: number
    excluded: number
    /** Importe de cada categoría, en orden de aparición. */
    byCategory: [string, number][]
    /** Recetas, en su orden. */
    recipes: SectionView[]
    /** Secciones que suman, en su orden. */
    groups: SectionView[]
    totalSurcharges: SurchargeView[]
}

/** Crea las fotos de las hojas. Solo tiene miembros estáticos. */
export class SheetViews {
    private constructor() {}

    /**
     * Hace la foto de una hoja y apunta en el registro los objetos que salen en ella.
     * @param sheet Hoja.
     * @param ids Registro de identificadores de la hoja.
     * @returns La foto.
     */
    static build(sheet: CostSheet, ids: IdRegistry): SheetView {
        ids.reset()
        const summary = sheet.summarize()
        const section = (s: Section): SectionView => {
            const base = s.base()
            return {
                id: ids.id(s),
                title: s.title,
                isFunction: s.isFunction,
                params: [...s.params],
                base,
                subtotal: s.subtotal(),
                callers: s.isFunction ? sheet.callers(s).length : 0,
                lines: s.lines.map((line) => SheetViews.#line(line, ids)),
                surcharges: s.surcharges.map((surcharge) => SheetViews.#surcharge(surcharge, ids, surcharge.amount(base), 0)),
            }
        }
        // Las recetas van primero, para que las líneas que las llaman encuentren su identificador.
        const recipes = sheet.functions.map(section)
        return {
            id: ids.id(sheet),
            name: sheet.name,
            date: sheet.date,
            description: sheet.description,
            categories: sheet.categories.map((name) => ({
                name,
                items: sheet.itemsInCategory(name).length,
                amount: summary.byCategory.get(name) ?? 0,
            })),
            cost: summary.cost,
            total: summary.total,
            excluded: summary.excluded,
            byCategory: [...summary.byCategory],
            recipes,
            groups: sheet.groups.map(section),
            totalSurcharges: sheet.totalSurcharges.map((surcharge, i) =>
                SheetViews.#surcharge(surcharge, ids, summary.totalSurcharges[i].amount, summary.totalSurcharges[i].runningTotal),
            ),
        }
    }

    /** Foto de una línea. */
    static #line(line: Line, ids: IdRegistry): LineView {
        return {
            id: ids.id(line),
            counts: line.counts,
            name: line.name,
            category: line.category,
            type: line.type,
            recipeId: line.function ? ids.id(line.function) : null,
            price: line.price,
            size: line.size,
            unit: line.unit,
            watts: line.watts,
            quantity: line.quantity,
            args: Object.fromEntries((line.function?.params ?? []).map((param) => [param, line.arg(param)])),
            timeUnit: line.timeUnit(),
            unitLabel: line.unitLabel(),
            unitPrice: line.unitPrice(),
            cost: line.cost(),
        }
    }

    /** Foto de un recargo, con su importe y lo acumulado (0 en los de una sección). */
    static #surcharge(surcharge: Surcharge, ids: IdRegistry, amount: number, runningTotal: number): SurchargeView {
        return {
            id: ids.id(surcharge),
            counts: surcharge.counts,
            name: surcharge.name,
            category: surcharge.category,
            percent: surcharge.percent,
            amount,
            runningTotal,
        }
    }
}

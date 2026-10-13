/**
 * @file Resumen de las cuentas de una hoja, tal como lo crea `CostSheet.summarize()`, o de varias hojas juntas con
 * `Summary.combine()`.
 */

/** Importe de un recargo sobre el total y lo acumulado tras aplicarlo. */
export interface SurchargeTotal {
    amount: number
    runningTotal: number
}

/** Foto de las cuentas de una hoja o de varias juntas. */
export class Summary {
    /** Total con los recargos sobre el total. */
    total: number
    /** Suma de los subtotales de las secciones. */
    cost: number
    /** Importe de cada categoría. */
    byCategory: Map<string, number>
    /** Importe de cada recargo sobre el total y lo acumulado tras aplicarlo. */
    totalSurcharges: SurchargeTotal[]
    /** Suma de las líneas y recargos de las secciones que no cuentan. */
    excluded: number

    /**
     * Crea el resumen.
     * @param values Valores del resumen.
     */
    constructor(values: Summary) {
        this.total = values.total
        this.cost = values.cost
        this.byCategory = values.byCategory
        this.totalSurcharges = values.totalSurcharges
        this.excluded = values.excluded
    }

    /**
     * Junta los resúmenes de varias hojas: suma el total, el coste, lo que no cuenta y el importe de cada categoría.
     * Los recargos sobre el total no se juntan.
     * @param summaries Resúmenes de las hojas.
     * @returns El resumen conjunto, con las categorías en orden de aparición y sin recargos sobre el total.
     */
    static combine(summaries: Summary[]): Summary {
        const byCategory = new Map<string, number>()
        let total = 0
        let cost = 0
        let excluded = 0
        for (const summary of summaries) {
            total += summary.total
            cost += summary.cost
            excluded += summary.excluded
            for (const [category, amount] of summary.byCategory) {
                byCategory.set(category, (byCategory.get(category) ?? 0) + amount)
            }
        }
        return new Summary({ total, cost, byCategory, totalSurcharges: [], excluded })
    }
}

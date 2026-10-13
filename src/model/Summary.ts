/**
 * @file Resumen de las cuentas de una hoja, tal como lo crea `CostSheet.summarize()`.
 */

/** Importe de un recargo sobre el total y lo acumulado tras aplicarlo. */
export interface SurchargeTotal {
    amount: number
    runningTotal: number
}

/** Foto de las cuentas de una hoja. */
export class Summary {
    /** Total con los recargos sobre el total. */
    total: number
    /** Suma de los subtotales de las secciones. */
    cost: number
    /** Importe de cada categoría. */
    byCategory: Map<string, number>
    /** Subtotal de cada sección: su base más sus recargos. */
    sectionSubtotals: number[]
    /** Base de cada sección: la suma de sus líneas que cuentan. */
    sectionBases: number[]
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
        this.sectionSubtotals = values.sectionSubtotals
        this.sectionBases = values.sectionBases
        this.totalSurcharges = values.totalSurcharges
        this.excluded = values.excluded
    }
}

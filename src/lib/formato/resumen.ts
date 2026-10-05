/**
 * @file Cuentas de un producto: base y subtotal de cada bloque, recargos sobre el total y reparto por categoría.
 */

import { UNTAGGED } from './categorias.ts'
import { lineCost, surchargeAmount } from './lineas.ts'
import type { Product } from './modelo.ts'

export interface Summary {
    /** Total con los recargos de «Sobre el total». */
    total: number
    /** Suma de los subtotales de los bloques. */
    cost: number
    byTag: Map<string, number>
    /** Subtotal de cada bloque: su base más sus recargos. */
    sectionSubtotals: number[]
    /** Base de cada bloque: la suma de sus líneas que cuentan. */
    sectionBases: number[]
    /** Importe de cada recargo de «Sobre el total» y lo acumulado tras aplicarlo. */
    totalSurcharges: { amount: number; runningTotal: number }[]
    /** Suma de las líneas y recargos de los bloques que no cuentan. */
    excluded: number
}

/** Reparte los importes por categoría y aparta los que no cuentan. */
class TagBreakdown {
    readonly byTag = new Map<string, number>()
    excluded = 0

    /** Suma `amount` a su categoría; sin categoría, a `UNTAGGED`. */
    add(tag: string, amount: number): void {
        const t = tag.trim() || UNTAGGED
        this.byTag.set(t, (this.byTag.get(t) ?? 0) + amount)
    }

    /**
     * Suma a `initial` el importe de los elementos que cuentan y los anota por categoría;
     * el de los que no cuentan va a `excluded`.
     */
    sum<T extends { counts: boolean; tag: string }>(items: T[], amountOf: (item: T) => number, initial = 0): number {
        let sum = initial
        for (const item of items) {
            const amount = amountOf(item)
            if (item.counts) {
                this.add(item.tag, amount)
                sum += amount
            } else {
                this.excluded += amount
            }
        }
        return sum
    }
}

/** Calcula las cuentas de un producto. */
export function summarize(product: Product): Summary {
    const breakdown = new TagBreakdown()
    const sectionBases: number[] = []
    const sectionSubtotals = product.sections.map((section) => {
        const base = breakdown.sum(section.lines, lineCost)
        sectionBases.push(base)
        return breakdown.sum(section.surcharges, (s) => surchargeAmount(s, base), base)
    })
    const sectionsCost = sectionSubtotals.reduce((a, b) => a + b, 0)
    // Los recargos sobre el total se aplican en orden sobre lo acumulado; los que no cuentan no van a `excluded`.
    let total = sectionsCost
    const totalSurcharges = product.totalSurcharges.map((s) => {
        const amount = surchargeAmount(s, total)
        if (s.counts) {
            breakdown.add(s.tag, amount)
            total += amount
        }
        return { amount, runningTotal: total }
    })
    return {
        total,
        cost: sectionsCost,
        byTag: breakdown.byTag,
        sectionSubtotals,
        sectionBases,
        totalSurcharges,
        excluded: breakdown.excluded,
    }
}

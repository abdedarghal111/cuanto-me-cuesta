/**
 * @file Cuentas de un documento: base y subtotal de cada bloque, recargos sobre el total y reparto por categoría.
 */

import { SIN_TAG } from './categorias.ts'
import { coste, recargo } from './lineas.ts'
import type { Documento } from './modelo.ts'

export interface Resumen {
    /** Total con los recargos de «Sobre el total». */
    total: number
    /** Suma de los subtotales de los bloques. */
    coste: number
    porTag: Map<string, number>
    /** Subtotal de cada bloque: su base más sus recargos. */
    porSeccion: number[]
    /** Base de cada bloque: la suma de sus líneas que cuentan. */
    base: number[]
    /** Importe de cada recargo de «Sobre el total» y lo acumulado tras aplicarlo. */
    sobreTotal: { importe: number; acumulado: number }[]
    /** Suma de las líneas y recargos de los bloques que no cuentan. */
    sinContar: number
}

/** Reparte los importes por categoría y aparta los que no cuentan. */
class Reparto {
    readonly porTag = new Map<string, number>()
    sinContar = 0

    /** Suma `importe` a su categoría; sin categoría, a `SIN_TAG`. */
    sumar(tag: string, importe: number): void {
        const t = tag.trim() || SIN_TAG
        this.porTag.set(t, (this.porTag.get(t) ?? 0) + importe)
    }

    /**
     * Suma a `inicial` el importe de los elementos que cuentan y los anota por categoría;
     * el de los que no cuentan va a `sinContar`.
     */
    contar<T extends { cuenta: boolean; tag: string }>(elementos: T[], importe: (x: T) => number, inicial = 0): number {
        let suma = inicial
        for (const x of elementos) {
            const c = importe(x)
            if (x.cuenta) {
                this.sumar(x.tag, c)
                suma += c
            } else {
                this.sinContar += c
            }
        }
        return suma
    }
}

/** Calcula las cuentas de un documento. */
export function resumir(doc: Documento): Resumen {
    const reparto = new Reparto()
    const base: number[] = []
    const porSeccion = doc.secciones.map((s) => {
        const b = reparto.contar(s.lineas, coste)
        base.push(b)
        return reparto.contar(s.recargos, (r) => recargo(r, b), b)
    })
    const costeBloques = porSeccion.reduce((a, b) => a + b, 0)
    // Los recargos sobre el total se aplican en orden sobre lo acumulado; los que no cuentan no van a `sinContar`.
    let total = costeBloques
    const sobreTotal = doc.sobreTotal.map((r) => {
        const importe = recargo(r, total)
        if (r.cuenta) {
            reparto.sumar(r.tag, importe)
            total += importe
        }
        return { importe, acumulado: total }
    })
    return { total, coste: costeBloques, porTag: reparto.porTag, porSeccion, base, sobreTotal, sinContar: reparto.sinContar }
}

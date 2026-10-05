/**
 * @file Reglas de cada tipo de línea: cómo se normaliza y cuánto cuesta. Un tipo nuevo solo necesita su entrada en `REGLAS`.
 */

import type { Linea, Recargo, Tipo } from './modelo.ts'
import { UNIDADES_TIEMPO, aDuracion, aNumero, normalizar, numero, segundos, unidadTiempo } from './numeros.ts'

/** Valores numéricos con los que se calcula el coste de una línea. */
interface Valores {
    precio: number
    por: number
    consumo: number
}

/** Comportamiento de un tipo de línea. */
interface ReglasTipo {
    /** Normaliza Precio, Por, Unidad y Consumo. */
    normalizar(l: Linea): Linea
    /** Precio, Por y Consumo de la línea como números, con sus valores por defecto. */
    valores(l: Linea): Valores
}

const REGLAS: Record<Tipo, ReglasTipo> = {
    numero: {
        normalizar: (l) => ({ ...l, precio: normalizar(l.precio), por: normalizar(l.por), consumo: normalizar(l.consumo) }),
        valores: (l) => ({ precio: aNumero(l.precio) ?? 0, por: aNumero(l.por) ?? 1, consumo: aNumero(l.consumo) ?? 0 }),
    },
    tiempo: {
        normalizar: (l) => {
            const unidad = unidadTiempo(l.unidad)
            // Un Por antiguo en horas:minutos ("3000:00") pasa a número.
            const por = aNumero(l.por, true)
            return {
                ...l,
                unidad,
                precio: normalizar(l.precio),
                por: por === null ? l.por.trim() : numero(por),
                consumo: aDuracion(l.consumo, unidad),
            }
        },
        // El Consumo se pasa a la unidad de la línea.
        valores: (l) => ({
            precio: aNumero(l.precio) ?? 0,
            por: aNumero(l.por, true) ?? 1,
            consumo: (segundos(l.consumo, l.unidad) ?? 0) / UNIDADES_TIEMPO[unidadTiempo(l.unidad)],
        }),
    },
    fijo: {
        normalizar: (l) => ({ ...l, precio: '1', por: '1', consumo: normalizar(l.consumo) }),
        valores: (l) => ({ precio: 1, por: 1, consumo: aNumero(l.consumo) ?? 0 }),
    },
}

/**
 * Normaliza Precio, Por, Consumo y Multiplicador según el tipo: en `fijo`, Precio y Por valen 1; en `tiempo`,
 * la Unidad es d, h o min, Por es un número y el Consumo una duración ("3d 5h").
 */
export function normalizarLinea(l: Linea): Linea {
    return { ...REGLAS[l.tipo].normalizar(l), multiplicador: normalizar(l.multiplicador) }
}

/**
 * Coste = Precio / Por × Consumo × Multiplicador. "Por" y "Multiplicador" vacíos cuentan como 1.
 * En `fijo`, el coste es Consumo × Multiplicador; en `tiempo`, el Consumo se pasa a la unidad de la línea.
 */
export function coste(l: Linea): number {
    const { precio, por, consumo } = REGLAS[l.tipo].valores(l)
    return por === 0 ? 0 : (precio / por) * consumo * (aNumero(l.multiplicador) ?? 1)
}

/** Importe de un recargo: su porcentaje de `base`. */
export const recargo = (r: Recargo, base: number) => ((aNumero(r.pct) ?? 0) / 100) * base

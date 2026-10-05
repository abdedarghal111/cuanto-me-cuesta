/**
 * @file Reglas de cada tipo de línea: cómo se normaliza y cuánto cuesta. Un tipo nuevo solo necesita su entrada en `LINE_TYPE_RULES`.
 */

import type { Line, LineType, Surcharge } from './modelo.ts'
import { TIME_UNIT_SECONDS, durationSeconds, formatNumber, normalizeDuration, normalizeNumber, parseNumber, timeUnit } from './numeros.ts'

/** Valores numéricos con los que se calcula el coste de una línea. */
interface CostInputs {
    price: number
    per: number
    usage: number
}

/** Comportamiento de un tipo de línea. */
interface LineTypeRules {
    /** Normaliza Precio, Por, Unidad y Consumo. */
    normalize(line: Line): Line
    /** Precio, Por y Consumo de la línea como números, con sus valores por defecto. */
    costInputs(line: Line): CostInputs
}

const LINE_TYPE_RULES: Record<LineType, LineTypeRules> = {
    number: {
        normalize: (line) => ({ ...line, price: normalizeNumber(line.price), per: normalizeNumber(line.per), usage: normalizeNumber(line.usage) }),
        costInputs: (line) => ({ price: parseNumber(line.price) ?? 0, per: parseNumber(line.per) ?? 1, usage: parseNumber(line.usage) ?? 0 }),
    },
    time: {
        normalize: (line) => {
            const unit = timeUnit(line.unit)
            // Un Por antiguo en horas:minutos ("3000:00") pasa a número.
            const per = parseNumber(line.per, true)
            return {
                ...line,
                unit,
                price: normalizeNumber(line.price),
                per: per === null ? line.per.trim() : formatNumber(per),
                usage: normalizeDuration(line.usage, unit),
            }
        },
        // El Consumo se pasa a la unidad de la línea.
        costInputs: (line) => ({
            price: parseNumber(line.price) ?? 0,
            per: parseNumber(line.per, true) ?? 1,
            usage: (durationSeconds(line.usage, line.unit) ?? 0) / TIME_UNIT_SECONDS[timeUnit(line.unit)],
        }),
    },
    fixed: {
        normalize: (line) => ({ ...line, price: '1', per: '1', usage: normalizeNumber(line.usage) }),
        costInputs: (line) => ({ price: 1, per: 1, usage: parseNumber(line.usage) ?? 0 }),
    },
}

/**
 * Normaliza Precio, Por, Consumo y Multiplicador según el tipo: en `fixed`, Precio y Por valen 1; en `time`,
 * la Unidad es d, h o min, Por es un número y el Consumo una duración ("3d 5h").
 */
export function normalizeLine(line: Line): Line {
    return { ...LINE_TYPE_RULES[line.type].normalize(line), multiplier: normalizeNumber(line.multiplier) }
}

/**
 * Coste = Precio / Por × Consumo × Multiplicador. "Por" y "Multiplicador" vacíos cuentan como 1.
 * En `fixed`, el coste es Consumo × Multiplicador; en `time`, el Consumo se pasa a la unidad de la línea.
 */
export function lineCost(line: Line): number {
    const { price, per, usage } = LINE_TYPE_RULES[line.type].costInputs(line)
    return per === 0 ? 0 : (price / per) * usage * (parseNumber(line.multiplier) ?? 1)
}

/** Importe de un recargo: su porcentaje de `base`. */
export const surchargeAmount = (surcharge: Surcharge, base: number) => ((parseNumber(surcharge.percent) ?? 0) / 100) * base

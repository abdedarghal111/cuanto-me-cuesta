/**
 * @file Números, importes, porcentajes y duraciones: de texto a número y de número a texto, con coma decimal.
 */

/** Unidades del tipo `time`, con sus segundos. */
export const TIME_UNIT_SECONDS: Record<string, number> = { d: 86400, h: 3600, min: 60 }

/**
 * Unidad de tiempo válida.
 * @param unit Unidad escrita.
 * @returns La unidad si es d, h o min; si no, h.
 */
export const timeUnit = (unit: string) => (unit.trim() in TIME_UNIT_SECONDS ? unit.trim() : 'h')

/**
 * Convierte un texto en número, con coma o punto decimal ("11,21").
 * @param text Texto del número.
 * @param allowHours Si admite también horas:minutos ("15:08" = 15 h 8 min).
 * @returns El número, o `null` si no es válido.
 */
export function parseNumber(text: string, allowHours = false): number | null {
    const t = text.replace(/[€%\s]/g, '')
    if (allowHours && /^\d+:\d{1,2}$/.test(t)) {
        const [hours, minutes] = t.split(':').map(Number)
        return hours + minutes / 60
    }
    if (!/^-?(\d+([.,]\d+)?|[.,]\d+)$/.test(t)) {
        return null
    }
    return Number(t.replace(',', '.'))
}

const numberFormat = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 4, useGrouping: false })
const eurosFormat = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const percentFormat = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/**
 * Escribe un número con coma decimal y hasta 4 decimales.
 * @param n Número.
 * @returns El número como texto ("11,21").
 */
export const formatNumber = (n: number) => numberFormat.format(n)

/**
 * Escribe un importe en euros con 2 decimales.
 * @param n Importe.
 * @returns El importe como texto ("11,21 €").
 */
export const formatEuros = (n: number) => `${eurosFormat.format(n)} €`

/**
 * Escribe un porcentaje con 1 decimal.
 * @param n Porcentaje.
 * @returns El porcentaje como texto ("15,0 %").
 */
export const formatPercent = (n: number) => `${percentFormat.format(n)} %`

/**
 * Escribe un número con coma decimal ("11.210" → "11,21"); horas y textos no numéricos quedan igual.
 * @param text Texto del número.
 * @returns El número normalizado.
 */
export function normalizeNumber(text: string): string {
    const t = text.trim()
    if (/^\d+:\d{1,2}$/.test(t)) {
        return t
    }
    const n = parseNumber(t)
    return n === null ? t : formatNumber(n)
}

/** Trozos de una duración: "3d 5h 1m 3s", "1,5h", "90min". */
const DURATION_PART = /(\d+(?:[.,]\d+)?)\s*(min|d|h|m|s)(?![a-z])/gi
/** Segundos de cada letra de una duración. */
const DURATION_LETTER_SECONDS: Record<string, number> = { d: 86400, h: 3600, min: 60, m: 60, s: 1 }
/** Partes con las que se escribe una duración, de mayor a menor. */
const DURATION_UNITS = [['d', 86400], ['h', 3600], ['m', 60], ['s', 1]] as const

/**
 * Segundos de una duración: "3d 5h 1m 3s", "15:08" (horas:minutos) o un número en `unit`.
 * @param text Texto de la duración.
 * @param unit Unidad de los números sueltos: d, h o min.
 * @returns Los segundos, o `null` si no es válida.
 */
export function durationSeconds(text: string, unit: string): number | null {
    const t = text.trim()
    const n = parseNumber(t, true)
    if (n !== null) {
        // Un número va en la unidad de la línea; "15:08" siempre son horas:minutos.
        return n * (t.includes(':') ? 3600 : TIME_UNIT_SECONDS[timeUnit(unit)])
    }
    if (!t || t.replace(DURATION_PART, '').trim() !== '') {
        return null
    }
    let total = 0
    for (const [, value, letter] of t.matchAll(DURATION_PART)) {
        total += (parseNumber(value) ?? 0) * DURATION_LETTER_SECONDS[letter.toLowerCase()]
    }
    return total
}

/**
 * Escribe una duración como "3d 5h 1m 3s", sin las partes a cero; vacío y textos no válidos quedan igual.
 * @param text Texto de la duración.
 * @param unit Unidad de los números sueltos: d, h o min.
 * @returns La duración normalizada.
 */
export function normalizeDuration(text: string, unit: string): string {
    const seconds = durationSeconds(text, unit)
    if (seconds === null) {
        return text.trim()
    }
    let remaining = Math.round(seconds)
    const parts: string[] = []
    for (const [letter, unitSeconds] of DURATION_UNITS) {
        const n = Math.floor(remaining / unitSeconds)
        remaining -= n * unitSeconds
        if (n > 0) {
            parts.push(`${n}${letter}`)
        }
    }
    const u = timeUnit(unit)
    return parts.join(' ') || `0${u === 'min' ? 'm' : u}`
}

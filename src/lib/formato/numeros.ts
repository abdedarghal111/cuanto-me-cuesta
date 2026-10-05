/**
 * @file Números, importes y duraciones: de texto a número y de número a texto, con coma decimal.
 */

/** Unidades del tipo `tiempo`, con sus segundos. */
export const UNIDADES_TIEMPO: Record<string, number> = { d: 86400, h: 3600, min: 60 }

/** Unidad de tiempo válida: la dada si es d, h o min; si no, h. */
export const unidadTiempo = (u: string) => (u.trim() in UNIDADES_TIEMPO ? u.trim() : 'h')

/**
 * Convierte un texto en número, con coma o punto decimal ("11,21").
 * Con `horas`, admite también horas:minutos ("15:08" = 15 h 8 min). Si no es válido, devuelve `null`.
 */
export function aNumero(texto: string, horas = false): number | null {
    const t = texto.replace(/[€%\s]/g, '')
    if (horas && /^\d+:\d{1,2}$/.test(t)) {
        const [h, m] = t.split(':').map(Number)
        return h + m / 60
    }
    if (!/^-?(\d+([.,]\d+)?|[.,]\d+)$/.test(t)) {
        return null
    }
    return Number(t.replace(',', '.'))
}

const fmtNumero = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 4, useGrouping: false })
const fmtEuros = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtPct = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

export const numero = (n: number) => fmtNumero.format(n)
export const euros = (n: number) => `${fmtEuros.format(n)} €`
export const pct = (n: number) => `${fmtPct.format(n)} %`

/** Escribe un número con coma decimal ("11.210" → "11,21"); horas y textos no numéricos quedan igual. */
export function normalizar(texto: string): string {
    const t = texto.trim()
    if (/^\d+:\d{1,2}$/.test(t)) {
        return t
    }
    const n = aNumero(t)
    return n === null ? t : numero(n)
}

/** Trozos de una duración: "3d 5h 1m 3s", "1,5h", "90min". */
const TROZO_DURACION = /(\d+(?:[.,]\d+)?)\s*(min|d|h|m|s)(?![a-z])/gi
/** Segundos de cada letra de una duración. */
const SEGUNDOS: Record<string, number> = { d: 86400, h: 3600, min: 60, m: 60, s: 1 }
/** Partes con las que se escribe una duración, de mayor a menor. */
const PARTES_DURACION = [['d', 86400], ['h', 3600], ['m', 60], ['s', 1]] as const

/**
 * Segundos de una duración: "3d 5h 1m 3s", "15:08" (horas:minutos) o un número en `unidad` (d, h o min).
 * Si no es válida, devuelve `null`.
 */
export function segundos(texto: string, unidad: string): number | null {
    const t = texto.trim()
    const n = aNumero(t, true)
    if (n !== null) {
        // Un número va en la unidad de la línea; "15:08" siempre son horas:minutos.
        return n * (t.includes(':') ? 3600 : UNIDADES_TIEMPO[unidadTiempo(unidad)])
    }
    if (!t || t.replace(TROZO_DURACION, '').trim() !== '') {
        return null
    }
    let total = 0
    for (const [, valor, letra] of t.matchAll(TROZO_DURACION)) {
        total += (aNumero(valor) ?? 0) * SEGUNDOS[letra.toLowerCase()]
    }
    return total
}

/** Escribe una duración como "3d 5h 1m 3s", sin las partes a cero; vacío y textos no válidos quedan igual. */
export function aDuracion(texto: string, unidad: string): string {
    const s = segundos(texto, unidad)
    if (s === null) {
        return texto.trim()
    }
    let resto = Math.round(s)
    const partes: string[] = []
    for (const [letra, valor] of PARTES_DURACION) {
        const n = Math.floor(resto / valor)
        resto -= n * valor
        if (n > 0) {
            partes.push(`${n}${letra}`)
        }
    }
    const u = unidadTiempo(unidad)
    return partes.join(' ') || `0${u === 'min' ? 'm' : u}`
}

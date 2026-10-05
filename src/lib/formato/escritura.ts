/**
 * @file Escritura de un producto en texto: cabecera, descripción, bloques, «Sobre el total», resumen e instrucciones.
 * Los costes, subtotales y el resumen se escriben para leerlos a mano; al cargar se recalculan.
 */

import { LINE_HEADER, LINE_WIDTH, SURCHARGE_HEADER, TOTAL_SURCHARGE_HEADER } from './columnas.ts'
import { PRODUCT_INSTRUCTIONS } from './instrucciones.ts'
import { lineCost, normalizeLine, surchargeAmount } from './lineas.ts'
import { LINE_TYPE_LABELS, type Line, type Product, type Section, type Surcharge } from './modelo.ts'
import { formatEuros, formatPercent, normalizeNumber } from './numeros.ts'
import { summarize, type Summary } from './resumen.ts'

/** Comienzo de una línea que se leería como el inicio de una parte del archivo. */
const PART_MARKER = /^(##|SOBRE EL TOTAL|RESUMEN|INSTRUCCIONES|DESCRIPCI)/

/** Alinea las columnas de `rows`; las de `rightAligned` se alinean a la derecha. */
function alignTable(rows: string[][], rightAligned: number[], separator = ' | '): string[] {
    const widths = rows[0].map((_, i) => Math.max(...rows.map((row) => (row[i] ?? '').length)))
    return rows.map((row) =>
        row.map((cell, i) => (rightAligned.includes(i) ? cell.padStart(widths[i]) : cell.padEnd(widths[i]))).join(separator).trimEnd(),
    )
}

/** Texto de una celda, sin el "|" que separa columnas. */
const cell = (text: string) => text.trim().replace(/\|/g, '/')

function lineRow(line: Line): string[] {
    const l = normalizeLine(line)
    return [
        l.counts ? 'sí' : 'no',
        cell(l.name),
        LINE_TYPE_LABELS[l.type],
        l.price,
        l.per,
        cell(l.unit),
        l.usage,
        l.multiplier,
        cell(l.tag),
        `= ${formatEuros(lineCost(l))}`,
    ]
}

/** Cuenta, concepto, porcentaje y categoría de un recargo, seguidos de `extra`. */
const surchargeRow = (surcharge: Surcharge, ...extra: string[]) =>
    [surcharge.counts ? 'sí' : 'no', cell(surcharge.name), normalizeNumber(surcharge.percent), cell(surcharge.tag), ...extra]

function headerToText(product: Product): string[] {
    return [
        `CUÁNTO ME CUESTA · ${product.name}`,
        '='.repeat(LINE_WIDTH),
        'Se puede leer y cambiar a mano: las instrucciones están al final.',
        '',
        `Producto: ${product.name}`,
        `Fecha:    ${product.date}`,
        `Categorías: ${product.tags.join(', ')}`,
        '',
    ]
}

function descriptionToText(product: Product): string[] {
    // Una línea que empiece como una parte del archivo se sangra con un espacio para que no se lea como tal.
    const lines = product.description.trimEnd().split(/\r?\n/).map((line) => (PART_MARKER.test(line) ? ` ${line}` : line))
    return ['DESCRIPCIÓN', ...lines, '']
}

function sectionToText(section: Section, base: number, subtotal: number): string[] {
    const title = `## ${cell(section.title) || 'Sin título'}`
    const subtotalText = `subtotal ${formatEuros(subtotal)}`
    const text = [`${title} ${'-'.repeat(Math.max(3, LINE_WIDTH - title.length - subtotalText.length - 2))} ${subtotalText}`]
    text.push(...alignTable([LINE_HEADER, ...section.lines.map(lineRow)], [3, 4, 6, 7]))
    if (section.surcharges.length) {
        text.push(`-- Recargos sobre el bloque (base ${formatEuros(base)}) --`)
        const rows = section.surcharges.map((s) => surchargeRow(s, `= ${formatEuros(surchargeAmount(s, base))}`))
        text.push(...alignTable([SURCHARGE_HEADER, ...rows], [2, 4]))
    }
    text.push('')
    return text
}

function totalSurchargesToText(product: Product, summary: Summary): string[] {
    if (!product.totalSurcharges.length) {
        return []
    }
    const title = `SOBRE EL TOTAL · coste ${formatEuros(summary.cost)} → total ${formatEuros(summary.total)} `
    const rows = product.totalSurcharges.map((s, i) =>
        surchargeRow(s, `= ${formatEuros(summary.totalSurcharges[i].amount)}`, `= ${formatEuros(summary.totalSurcharges[i].runningTotal)}`),
    )
    return [title + '-'.repeat(Math.max(3, LINE_WIDTH - title.length)), ...alignTable([TOTAL_SURCHARGE_HEADER, ...rows], [2, 4, 5]), '']
}

function summaryToText(summary: Summary): string[] {
    const rows = [...summary.byTag].map(([tag, amount]) => [
        tag,
        formatEuros(amount),
        summary.total > 0 ? formatPercent((amount / summary.total) * 100) : '',
    ])
    rows.push(['TOTAL', formatEuros(summary.total), ''])
    if (summary.excluded > 0) {
        rows.push(['(no cuenta)', formatEuros(summary.excluded), ''])
    }
    return ['RESUMEN POR CATEGORÍA (se recalcula solo, no hace falta tocarlo)', '-'.repeat(LINE_WIDTH), ...alignTable(rows, [1, 2], '   '), '']
}

/** Escribe un producto como texto, con la fecha de guardado `savedAt`. */
export function productToText(product: Product, savedAt = new Date()): string {
    const summary = summarize(product)
    const text = [
        ...headerToText(product),
        ...descriptionToText(product),
        ...product.sections.flatMap((section, i) => sectionToText(section, summary.sectionBases[i], summary.sectionSubtotals[i])),
        ...totalSurchargesToText(product, summary),
        ...summaryToText(summary),
        `Guardado: ${savedAt.toLocaleString('es-ES')}`,
        '',
        ...PRODUCT_INSTRUCTIONS,
    ]
    return text.join('\n') + '\n'
}

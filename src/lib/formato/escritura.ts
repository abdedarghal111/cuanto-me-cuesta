/**
 * @file Escritura de un producto en texto: cabecera, descripción, bloques, «Sobre el total», resumen e instrucciones.
 * Los costes, subtotales y el resumen se escriben para leerlos a mano; al cargar se recalculan.
 */

import { ANCHO, CABECERA, CABECERA_RECARGO, CABECERA_TOTAL } from './columnas.ts'
import { INSTRUCCIONES } from './instrucciones.ts'
import { coste, normalizarLinea, recargo } from './lineas.ts'
import { TIPOS, type Documento, type Linea, type Recargo, type Seccion } from './modelo.ts'
import { euros, normalizar, pct } from './numeros.ts'
import { resumir, type Resumen } from './resumen.ts'

/** Comienzo de una línea que se leería como el inicio de una parte del archivo. */
const MARCA = /^(##|SOBRE EL TOTAL|RESUMEN|INSTRUCCIONES|DESCRIPCI)/

/** Alinea las columnas de `filas`; las de `derecha` se alinean a la derecha. */
function tabla(filas: string[][], derecha: number[], separador = ' | '): string[] {
    const anchos = filas[0].map((_, i) => Math.max(...filas.map((f) => (f[i] ?? '').length)))
    return filas.map((f) =>
        f.map((c, i) => (derecha.includes(i) ? c.padStart(anchos[i]) : c.padEnd(anchos[i]))).join(separador).trimEnd(),
    )
}

/** Texto de una celda, sin el "|" que separa columnas. */
const celda = (t: string) => t.trim().replace(/\|/g, '/')

function filaDeLinea(linea: Linea): string[] {
    const l = normalizarLinea(linea)
    return [
        l.cuenta ? 'sí' : 'no',
        celda(l.concepto),
        TIPOS[l.tipo],
        l.precio,
        l.por,
        celda(l.unidad),
        l.consumo,
        l.multiplicador,
        celda(l.tag),
        `= ${euros(coste(l))}`,
    ]
}

/** Cuenta, concepto, porcentaje y categoría de un recargo, seguidos de `extra`. */
const filaDeRecargo = (r: Recargo, ...extra: string[]) =>
    [r.cuenta ? 'sí' : 'no', celda(r.concepto), normalizar(r.pct), celda(r.tag), ...extra]

function cabeceraATexto(doc: Documento): string[] {
    return [
        `CUÁNTO ME CUESTA · ${doc.producto}`,
        '='.repeat(ANCHO),
        'Se puede leer y cambiar a mano: las instrucciones están al final.',
        '',
        `Producto: ${doc.producto}`,
        `Fecha:    ${doc.fecha}`,
        `Categorías: ${doc.tags.join(', ')}`,
        '',
    ]
}

function descripcionATexto(doc: Documento): string[] {
    // Una línea que empiece como una parte del archivo se sangra con un espacio para que no se lea como tal.
    const lineas = doc.descripcion.trimEnd().split(/\r?\n/).map((l) => (MARCA.test(l) ? ` ${l}` : l))
    return ['DESCRIPCIÓN', ...lineas, '']
}

function seccionATexto(sec: Seccion, base: number, subtotal: number): string[] {
    const titulo = `## ${celda(sec.titulo) || 'Sin título'}`
    const sub = `subtotal ${euros(subtotal)}`
    const s = [`${titulo} ${'-'.repeat(Math.max(3, ANCHO - titulo.length - sub.length - 2))} ${sub}`]
    s.push(...tabla([CABECERA, ...sec.lineas.map(filaDeLinea)], [3, 4, 6, 7]))
    if (sec.recargos.length) {
        s.push(`-- Recargos sobre el bloque (base ${euros(base)}) --`)
        const filas = sec.recargos.map((x) => filaDeRecargo(x, `= ${euros(recargo(x, base))}`))
        s.push(...tabla([CABECERA_RECARGO, ...filas], [2, 4]))
    }
    s.push('')
    return s
}

function sobreTotalATexto(doc: Documento, r: Resumen): string[] {
    if (!doc.sobreTotal.length) {
        return []
    }
    const titulo = `SOBRE EL TOTAL · coste ${euros(r.coste)} → total ${euros(r.total)} `
    const filas = doc.sobreTotal.map((x, i) =>
        filaDeRecargo(x, `= ${euros(r.sobreTotal[i].importe)}`, `= ${euros(r.sobreTotal[i].acumulado)}`),
    )
    return [titulo + '-'.repeat(Math.max(3, ANCHO - titulo.length)), ...tabla([CABECERA_TOTAL, ...filas], [2, 4, 5]), '']
}

function resumenATexto(r: Resumen): string[] {
    const filas = [...r.porTag].map(([tag, c]) => [tag, euros(c), r.total > 0 ? pct((c / r.total) * 100) : ''])
    filas.push(['TOTAL', euros(r.total), ''])
    if (r.sinContar > 0) {
        filas.push(['(no cuenta)', euros(r.sinContar), ''])
    }
    return ['RESUMEN POR CATEGORÍA (se recalcula solo, no hace falta tocarlo)', '-'.repeat(ANCHO), ...tabla(filas, [1, 2], '   '), '']
}

/** Escribe un producto como texto, con la fecha de guardado `ahora`. */
export function aTexto(doc: Documento, ahora = new Date()): string {
    const r = resumir(doc)
    const s = [
        ...cabeceraATexto(doc),
        ...descripcionATexto(doc),
        ...doc.secciones.flatMap((sec, i) => seccionATexto(sec, r.base[i], r.porSeccion[i])),
        ...sobreTotalATexto(doc, r),
        ...resumenATexto(r),
        `Guardado: ${ahora.toLocaleString('es-ES')}`,
        '',
        ...INSTRUCCIONES,
    ]
    return s.join('\n') + '\n'
}

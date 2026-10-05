/**
 * @file Lectura de productos y de la plantilla. Lee cabecera, descripción, bloques y «Sobre el total»,
 * acepta los formatos anteriores, ignora lo que no entiende y nunca lanza errores.
 */

import { deNombreDeArchivo, hoy } from './archivo'
import { listaDeTags, usados } from './categorias'
import { COLUMNAS, COLUMNAS_RECARGO, clave, claveColumna } from './columnas'
import { normalizarLinea } from './lineas'
import type { Documento, Linea, Plantilla, Recargo, Seccion, Tipo } from './modelo'
import { aNumero, normalizar, numero } from './numeros'

/** Valores de una fila, por clave de columna; sin las columnas calculadas («= …»). */
type Valores = Record<string, string>

/** Parte del archivo que se está leyendo; lo que sigue a RESUMEN o INSTRUCCIONES se ignora. */
type Parte = 'cabecera' | 'descripcion' | 'bloques' | 'total' | 'ignorar'

/** Campos de la cabecera. «Notas:» y «Tags:» son de formatos anteriores. */
const CAMPO = /^(Producto|Fecha|Notas|Tags|Categor[íi]as|Por defecto)\s*:\s*(.*)$/i

/** Lo que se saca de un archivo; los campos van por clave («producto», «tags», «pordefecto»…). */
interface Leido {
    campos: Record<string, string>
    descripcion: string[]
    secciones: Seccion[]
    sobreTotal: Recargo[]
}

/** Si la fila suma: todo menos «no», «n», «0» o «false». */
const cuentaDe = (v: Valores) => !/^(no|n|0|false)$/i.test(v.cuenta ?? '')

/** Tipo de una línea leída. Sin columna «Tipo» (formato anterior), es `tiempo` si la unidad es «h» o el consumo lleva «:». */
function tipoDe(v: Valores): Tipo {
    const t = clave(v.tipo ?? '')
    if (t === 'numero' || t === 'tiempo' || t === 'fijo') {
        return t
    }
    return (v.unidad ?? '').trim() === 'h' || (v.consumo ?? '').includes(':') ? 'tiempo' : 'numero'
}

function lineaDe(v: Valores): Linea {
    return normalizarLinea({
        cuenta: cuentaDe(v),
        concepto: v.concepto ?? '',
        tipo: tipoDe(v),
        precio: v.precio ?? '',
        por: v.por ?? '',
        unidad: v.unidad ?? '',
        consumo: v.consumo ?? '',
        multiplicador: v.multiplicador ?? '',
        tag: v.tag ?? '',
    })
}

function recargoDe(v: Valores): Recargo {
    return { cuenta: cuentaDe(v), concepto: v.concepto ?? '', pct: normalizar(v.pct ?? ''), tag: v.tag ?? '' }
}

/** Formato anterior: una línea con unidad «%» es un recargo del bloque (Consumo / Por × Multiplicador, en %). */
function recargoAntiguo(v: Valores): Recargo {
    const por = aNumero(v.por ?? '') ?? 1
    const veces = (aNumero(v.consumo ?? '', true) ?? 0) * (aNumero(v.multiplicador ?? '') ?? 1)
    return { cuenta: cuentaDe(v), concepto: v.concepto ?? '', pct: numero(por === 0 ? 0 : (veces / por) * 100), tag: v.tag ?? '' }
}

/** Lee un archivo línea a línea y acumula lo que encuentra. */
class Lector {
    readonly campos: Record<string, string> = {}
    readonly descripcion: string[] = []
    readonly secciones: Seccion[] = []
    readonly sobreTotal: Recargo[] = []
    /** Bloque que se está leyendo. */
    private actual: Seccion | undefined
    /** Clave de cada columna de las filas que siguen. */
    private orden: string[] = [...COLUMNAS]
    /** Si las filas son recargos del bloque actual (tras su línea «--»). */
    private enRecargos = false
    // Cabecera → descripción → bloques → sobre el total → ignorar.
    private parte: Parte = 'cabecera'

    /** Si las filas con "|" se leen: dentro de un bloque o de «Sobre el total». */
    private get enTabla(): boolean {
        return this.actual !== undefined || this.parte === 'total'
    }

    /** Lee una línea del archivo. */
    leer(cruda: string): void {
        if (this.marca(cruda) || this.parte === 'ignorar') {
            return
        }
        if (this.parte === 'descripcion') {
            this.descripcion.push(cruda.trimEnd())
            return
        }
        const linea = cruda.trim()
        if (linea === '') {
            return
        }
        if (!this.enTabla) {
            this.campo(linea)
            return
        }
        if (this.actual && cruda.startsWith('--')) {
            // "-- Recargos sobre el bloque (base 8,01 €) --": lo que sigue son recargos del bloque.
            this.orden = [...COLUMNAS_RECARGO]
            this.enRecargos = true
            return
        }
        if (linea.includes('|')) {
            this.fila(linea.split('|').map((x) => x.trim()))
        }
    }

    /** Lo leído, con la descripción sin líneas vacías al principio ni al final. */
    resultado(): Leido {
        const d = this.descripcion
        while (d[0] === '') {
            d.shift()
        }
        while (d.at(-1) === '') {
            d.pop()
        }
        return { campos: this.campos, descripcion: d, secciones: this.secciones, sobreTotal: this.sobreTotal }
    }

    /** Si la línea empieza una parte del archivo, cambia a ella y devuelve `true`. */
    private marca(cruda: string): boolean {
        if (cruda.startsWith('##')) {
            // "## Impresión ------ subtotal 9,21 €" → "Impresión"
            const titulo = cruda.trim().replace(/^#+/, '').replace(/\s-{3,}.*$/, '').trim()
            this.actual = { titulo, lineas: [], recargos: [] }
            this.secciones.push(this.actual)
            this.orden = [...COLUMNAS]
            this.enRecargos = false
            this.parte = 'bloques'
            return true
        }
        if (/^(RESUMEN|INSTRUCCIONES)/.test(cruda)) {
            this.parte = 'ignorar'
            return true
        }
        if (/^DESCRIPCI[ÓO]N\s*$/.test(cruda)) {
            this.parte = 'descripcion'
            return true
        }
        if (/^SOBRE EL TOTAL/.test(cruda)) {
            this.actual = undefined
            this.orden = [...COLUMNAS_RECARGO]
            this.parte = 'total'
            return true
        }
        return false
    }

    /** Lee un campo de la cabecera («Producto: …»); «Tags:» se acepta como «Categorías:». */
    private campo(linea: string): void {
        const m = linea.match(CAMPO)
        if (m) {
            const k = clave(m[1])
            this.campos[k === 'categorias' ? 'tags' : k] = m[2].trim()
        }
    }

    /** Lee una fila de una tabla: de títulos, línea de gasto o recargo. */
    private fila(c: string[]): void {
        if (clave(c[0]) === 'cuenta') {
            // Fila de títulos: fija el orden de las columnas.
            this.orden = c.map(claveColumna)
            return
        }
        const v: Valores = {}
        this.orden.forEach((col, i) => {
            if (!(c[i] ?? '').startsWith('=')) {
                v[col] = c[i] ?? ''
            }
        })
        if (!this.actual) {
            this.sobreTotal.push(recargoDe(v))
        } else if (this.enRecargos) {
            this.actual.recargos.push(recargoDe(v))
        } else if ((v.unidad ?? '').trim() === '%') {
            this.actual.recargos.push(recargoAntiguo(v))
        } else {
            this.actual.lineas.push(lineaDe(v))
        }
    }
}

/** Lee un texto completo con un `Lector`. */
function leer(texto: string): Leido {
    const lector = new Lector()
    for (const cruda of texto.split(/\r?\n/)) {
        lector.leer(cruda)
    }
    return lector.resultado()
}

/** Lee un producto. Producto y fecha, si faltan, salen del nombre del archivo. */
export function deTexto(texto: string, nombreArchivo = ''): Documento {
    const { campos, descripcion, secciones, sobreTotal } = leer(texto)
    const deNombre = deNombreDeArchivo(nombreArchivo)
    return {
        producto: campos.producto || deNombre.producto || 'Sin nombre',
        fecha: campos.fecha || deNombre.fecha || hoy(),
        // Sin DESCRIPCIÓN, se usa el campo de una línea «Notas:».
        descripcion: descripcion.length ? descripcion.join('\n') : (campos.notas ?? ''),
        // Las de «Categorías:» más las que usan las líneas y recargos y faltan ahí.
        tags: [...new Set([...listaDeTags(campos.tags ?? ''), ...usados(secciones, sobreTotal)])],
        secciones,
        sobreTotal,
    }
}

/** Lee la plantilla: categorías, bloques por defecto, bloques y recargos sobre el total. */
export function plantillaDeTexto(texto: string): Plantilla {
    const { campos, secciones, sobreTotal } = leer(texto)
    return { tags: listaDeTags(campos.tags ?? ''), porDefecto: listaDeTags(campos.pordefecto ?? ''), secciones, sobreTotal }
}

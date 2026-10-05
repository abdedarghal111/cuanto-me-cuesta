/**
 * @file Lectura de productos y de la plantilla. Lee cabecera, descripción, bloques y «Sobre el total»,
 * acepta los formatos anteriores, ignora lo que no entiende y nunca lanza errores.
 */

import { parseFileName, today } from './archivo.ts'
import { parseTagList, usedTags } from './categorias.ts'
import { LINE_COLUMNS, SURCHARGE_COLUMNS, columnKey, normalizeKey } from './columnas.ts'
import { normalizeLine } from './lineas.ts'
import { LINE_TYPE_LABELS, type Line, type LineType, type Product, type Section, type Surcharge, type Template } from './modelo.ts'
import { formatNumber, normalizeNumber, parseNumber } from './numeros.ts'

/** Valores de una fila, por clave de columna; sin las columnas calculadas («= …»). */
type RowValues = Record<string, string>

/** Parte del archivo que se está leyendo; lo que sigue a RESUMEN o INSTRUCCIONES se ignora. */
type FilePart = 'header' | 'description' | 'sections' | 'totalSurcharges' | 'ignored'

/** Campos de la cabecera. «Notas:» y «Tags:» son de formatos anteriores. */
const HEADER_FIELD = /^(Producto|Fecha|Notas|Tags|Categor[íi]as|Por defecto)\s*:\s*(.*)$/i

/** Clave de cada campo de la cabecera; «Tags:» se acepta como «Categorías:». */
const HEADER_FIELD_KEYS: Record<string, string> = {
    producto: 'name',
    fecha: 'date',
    notas: 'notes',
    tags: 'tags',
    categorias: 'tags',
    pordefecto: 'defaultSectionTitles',
}

/** Lo que se saca de un archivo; los campos van por clave («name», «tags», «defaultSectionTitles»…). */
interface ParsedFile {
    fields: Record<string, string>
    description: string[]
    sections: Section[]
    totalSurcharges: Surcharge[]
}

/** Si la fila suma: todo menos «no», «n», «0» o «false». */
const parseCounts = (values: RowValues) => !/^(no|n|0|false)$/i.test(values.counts ?? '')

/** Tipo de una línea leída. Sin columna «Tipo» (formato anterior), es `time` si la unidad es «h» o el consumo lleva «:». */
function parseLineType(values: RowValues): LineType {
    const key = normalizeKey(values.type ?? '')
    const type = (Object.keys(LINE_TYPE_LABELS) as LineType[]).find((t) => normalizeKey(LINE_TYPE_LABELS[t]) === key)
    if (type) {
        return type
    }
    return (values.unit ?? '').trim() === 'h' || (values.usage ?? '').includes(':') ? 'time' : 'number'
}

function parseLine(values: RowValues): Line {
    return normalizeLine({
        counts: parseCounts(values),
        name: values.name ?? '',
        type: parseLineType(values),
        price: values.price ?? '',
        per: values.per ?? '',
        unit: values.unit ?? '',
        usage: values.usage ?? '',
        multiplier: values.multiplier ?? '',
        tag: values.tag ?? '',
    })
}

function parseSurcharge(values: RowValues): Surcharge {
    return { counts: parseCounts(values), name: values.name ?? '', percent: normalizeNumber(values.percent ?? ''), tag: values.tag ?? '' }
}

/** Formato anterior: una línea con unidad «%» es un recargo del bloque (Consumo / Por × Multiplicador, en %). */
function parseLegacySurcharge(values: RowValues): Surcharge {
    const per = parseNumber(values.per ?? '') ?? 1
    const times = (parseNumber(values.usage ?? '', true) ?? 0) * (parseNumber(values.multiplier ?? '') ?? 1)
    return {
        counts: parseCounts(values),
        name: values.name ?? '',
        percent: formatNumber(per === 0 ? 0 : (times / per) * 100),
        tag: values.tag ?? '',
    }
}

/** Lee un archivo línea a línea y acumula lo que encuentra. */
class Parser {
    readonly fields: Record<string, string> = {}
    readonly description: string[] = []
    readonly sections: Section[] = []
    readonly totalSurcharges: Surcharge[] = []
    /** Bloque que se está leyendo. */
    private currentSection: Section | undefined
    /** Clave de cada columna de las filas que siguen. */
    private columns: string[] = [...LINE_COLUMNS]
    /** Si las filas son recargos del bloque actual (tras su línea «--»). */
    private inSurcharges = false
    // Cabecera → descripción → bloques → sobre el total → ignorar.
    private part: FilePart = 'header'

    /** Si las filas con "|" se leen: dentro de un bloque o de «Sobre el total». */
    private get inTable(): boolean {
        return this.currentSection !== undefined || this.part === 'totalSurcharges'
    }

    /** Lee una línea del archivo. */
    readLine(raw: string): void {
        if (this.enterPart(raw) || this.part === 'ignored') {
            return
        }
        if (this.part === 'description') {
            this.description.push(raw.trimEnd())
            return
        }
        const line = raw.trim()
        if (line === '') {
            return
        }
        if (!this.inTable) {
            this.readField(line)
            return
        }
        if (this.currentSection && raw.startsWith('--')) {
            // "-- Recargos sobre el bloque (base 8,01 €) --": lo que sigue son recargos del bloque.
            this.columns = [...SURCHARGE_COLUMNS]
            this.inSurcharges = true
            return
        }
        if (line.includes('|')) {
            this.readRow(line.split('|').map((cell) => cell.trim()))
        }
    }

    /** Lo leído, con la descripción sin líneas vacías al principio ni al final. */
    result(): ParsedFile {
        const description = this.description
        while (description[0] === '') {
            description.shift()
        }
        while (description.at(-1) === '') {
            description.pop()
        }
        return { fields: this.fields, description, sections: this.sections, totalSurcharges: this.totalSurcharges }
    }

    /** Si la línea empieza una parte del archivo, cambia a ella y devuelve `true`. */
    private enterPart(raw: string): boolean {
        if (raw.startsWith('##')) {
            // "## Impresión ------ subtotal 9,21 €" → "Impresión"
            const title = raw.trim().replace(/^#+/, '').replace(/\s-{3,}.*$/, '').trim()
            this.currentSection = { title, lines: [], surcharges: [] }
            this.sections.push(this.currentSection)
            this.columns = [...LINE_COLUMNS]
            this.inSurcharges = false
            this.part = 'sections'
            return true
        }
        if (/^(RESUMEN|INSTRUCCIONES)/.test(raw)) {
            this.part = 'ignored'
            return true
        }
        if (/^DESCRIPCI[ÓO]N\s*$/.test(raw)) {
            this.part = 'description'
            return true
        }
        if (/^SOBRE EL TOTAL/.test(raw)) {
            this.currentSection = undefined
            this.columns = [...SURCHARGE_COLUMNS]
            this.part = 'totalSurcharges'
            return true
        }
        return false
    }

    /** Lee un campo de la cabecera («Producto: …»). */
    private readField(line: string): void {
        const match = line.match(HEADER_FIELD)
        if (match) {
            this.fields[HEADER_FIELD_KEYS[normalizeKey(match[1])]] = match[2].trim()
        }
    }

    /** Lee una fila de una tabla: de títulos, línea de gasto o recargo. */
    private readRow(cells: string[]): void {
        if (columnKey(cells[0]) === 'counts') {
            // Fila de títulos: fija el orden de las columnas.
            this.columns = cells.map(columnKey)
            return
        }
        const values: RowValues = {}
        this.columns.forEach((column, i) => {
            if (!(cells[i] ?? '').startsWith('=')) {
                values[column] = cells[i] ?? ''
            }
        })
        if (!this.currentSection) {
            this.totalSurcharges.push(parseSurcharge(values))
        } else if (this.inSurcharges) {
            this.currentSection.surcharges.push(parseSurcharge(values))
        } else if ((values.unit ?? '').trim() === '%') {
            this.currentSection.surcharges.push(parseLegacySurcharge(values))
        } else {
            this.currentSection.lines.push(parseLine(values))
        }
    }
}

/** Lee un texto completo con un `Parser`. */
function parse(text: string): ParsedFile {
    const parser = new Parser()
    for (const raw of text.split(/\r?\n/)) {
        parser.readLine(raw)
    }
    return parser.result()
}

/** Lee un producto. Nombre y fecha, si faltan, salen del nombre del archivo. */
export function parseProduct(text: string, sourceFileName = ''): Product {
    const { fields, description, sections, totalSurcharges } = parse(text)
    const fromFileName = parseFileName(sourceFileName)
    return {
        name: fields.name || fromFileName.name || 'Sin nombre',
        date: fields.date || fromFileName.date || today(),
        // Sin DESCRIPCIÓN, se usa el campo de una línea «Notas:».
        description: description.length ? description.join('\n') : (fields.notes ?? ''),
        // Las de «Categorías:» más las que usan las líneas y recargos y faltan ahí.
        tags: [...new Set([...parseTagList(fields.tags ?? ''), ...usedTags(sections, totalSurcharges)])],
        sections,
        totalSurcharges,
    }
}

/** Lee la plantilla: categorías, bloques por defecto, bloques y recargos sobre el total. */
export function parseTemplate(text: string): Template {
    const { fields, sections, totalSurcharges } = parse(text)
    return {
        tags: parseTagList(fields.tags ?? ''),
        defaultSectionTitles: parseTagList(fields.defaultSectionTitles ?? ''),
        sections,
        totalSurcharges,
    }
}

/**
 * @file Línea de gasto: el precio de una unidad, escrito según su tipo, por la Cantidad.
 */

import { LineItem } from './LineItem.ts'
import { LINE_TYPE_LABELS, type LineType } from './LineType.ts'
import type { SerializableClass } from './SerializableClass.ts'
import { Column } from './text/Column.ts'
import type { DocumentReader } from './text/DocumentReader.ts'
import {
    TIME_UNIT_SECONDS, durationSeconds, isTimeUnit, normalizeDuration, normalizeNumber, parseNumber, type TimeUnit,
} from './text/numbers.ts'

/** Partes del precio de una línea, como texto. */
interface PriceParts {
    price: string
    size: string
    unit: string
    watts: string
}

/** Comportamiento de un tipo de línea. */
interface LineTypeRules {
    /** Patrón de la celda Precio; cada grupo es una de `parts`, en orden. */
    pattern: RegExp
    /** Partes que lleva la celda Precio. */
    parts: (keyof PriceParts)[]
    /** Lo que se espera en la celda Precio, para el error. */
    expected: string
    /** Escribe la celda Precio. */
    format(line: Line): string
    /** Precio de una unidad, en €. */
    unitPrice(line: Line): number
    /** Unidad de tiempo de la Cantidad, o `null` si la Cantidad es un número. */
    timeUnit(line: Line): TimeUnit | null
}

/**
 * Número de una parte del precio.
 * @param text Texto de la parte.
 * @param fallback Valor si está vacía o no es un número.
 * @returns El número.
 */
const num = (text: string, fallback = 0) => parseNumber(text) ?? fallback

/** Reglas de cada tipo. Un tipo nuevo solo necesita su entrada aquí y en `LineType`. */
const LINE_TYPE_RULES: Record<LineType, LineTypeRules> = {
    common: {
        pattern: /^(.*?)\s*€$/,
        parts: ['price'],
        expected: 'en Precio el precio de una unidad («6,5 €»)',
        format: (line) => `${normalizeNumber(line.price)} €`,
        unitPrice: (line) => num(line.price),
        timeUnit: () => null,
    },
    lot: {
        pattern: /^(.*?)\s*€ por(?:\s+(\S+))?(?:\s+(.+))?$/,
        parts: ['price', 'size', 'unit'],
        expected: 'en Precio lo que costó el lote y lo que trae («4,2 € por 20 ud»)',
        format: (line) => `${normalizeNumber(line.price)} € por ${normalizeNumber(line.size)} ${line.unit.trim()}`,
        unitPrice: (line) => {
            const size = num(line.size, 1)
            return size === 0 ? 0 : num(line.price) / size
        },
        // Un lote por d, h o min se gasta por duraciones.
        timeUnit: (line) => {
            const unit = line.unit.trim()
            return isTimeUnit(unit) ? unit : null
        },
    },
    hours: {
        pattern: /^(.*?)\s*€\/h$/,
        parts: ['price'],
        expected: 'en Precio el precio de una hora («12 €/h»)',
        format: (line) => `${normalizeNumber(line.price)} €/h`,
        unitPrice: (line) => num(line.price),
        timeUnit: () => 'h',
    },
    power: {
        pattern: /^(.*?)\s*W a\s*(.*?)\s*€\/kWh$/,
        parts: ['watts', 'price'],
        expected: 'en Precio la potencia y el precio de la luz («140 W a 0,20 €/kWh»)',
        format: (line) => `${normalizeNumber(line.watts)} W a ${normalizeNumber(line.price)} €/kWh`,
        unitPrice: (line) => (num(line.watts) / 1000) * num(line.price),
        timeUnit: () => 'h',
    },
}

/**
 * Línea de gasto, en blanco y de tipo común al crearse. Coste = precio de una unidad × Cantidad. Los números se
 * guardan como texto tal cual se escriben ("11,21", "0,5", "15:08").
 */
export class Line extends LineItem {
    /** Columnas de la tabla de líneas de una sección. */
    static readonly COLUMNS: Column[] = [
        new Column('Cuenta', 'counts'),
        new Column('Concepto', 'name'),
        new Column('Tipo', 'type'),
        new Column('Precio', 'price'),
        new Column('Cantidad', 'quantity', true),
        new Column('Categoría', 'category'),
        new Column('= Coste', 'cost', true),
    ]

    #type: LineType = 'common'
    #price = ''
    #size = ''
    #unit = ''
    #watts = ''
    #quantity = ''

    /** Tipo: cómo se escribe el precio de una unidad. */
    get type(): LineType {
        return this.#type
    }

    set type(type: LineType) {
        this.#type = type
        this.notify()
    }

    /** Precio en €: de una unidad (`common`), del lote (`lot`), de una hora (`hours`) o del kWh (`power`). */
    get price(): string {
        return this.#price
    }

    set price(price: string) {
        this.#price = price
        this.notify()
    }

    /** Lo que trae el lote (`lot`); vacío vale 1. */
    get size(): string {
        return this.#size
    }

    set size(size: string) {
        this.#size = size
        this.notify()
    }

    /** Unidad del lote (`lot`): texto libre (g, ml, ud…); con d, h o min, la Cantidad es una duración. */
    get unit(): string {
        return this.#unit
    }

    set unit(unit: string) {
        this.#unit = unit
        this.notify()
    }

    /** Potencia en W (`power`). */
    get watts(): string {
        return this.#watts
    }

    set watts(watts: string) {
        this.#watts = watts
        this.notify()
    }

    /** Cantidad: un número, o una duración si el tipo se gasta por tiempo. */
    get quantity(): string {
        return this.#quantity
    }

    set quantity(quantity: string) {
        this.#quantity = quantity
        this.notify()
    }

    /**
     * Unidad de tiempo de la Cantidad.
     * @returns d, h o min si la Cantidad es una duración; si no, `null`.
     */
    timeUnit(): TimeUnit | null {
        return LINE_TYPE_RULES[this.#type].timeUnit(this)
    }

    /**
     * Precio de una unidad: de una pieza, de una unidad del lote o de una hora.
     * @returns El precio en €.
     */
    unitPrice(): number {
        return LINE_TYPE_RULES[this.#type].unitPrice(this)
    }

    /**
     * Cantidad como número; una duración, en la unidad de tiempo de la línea.
     * @returns La cantidad, o 0 si está vacía o no es válida.
     */
    amount(): number {
        const unit = this.timeUnit()
        if (unit) {
            return (durationSeconds(this.#quantity, unit) ?? 0) / TIME_UNIT_SECONDS[unit]
        }
        return parseNumber(this.#quantity) ?? 0
    }

    /**
     * Coste = precio de una unidad × Cantidad.
     * @returns El coste en €.
     */
    cost(): number {
        return this.unitPrice() * this.amount()
    }

    /** Normaliza solo la Cantidad (una duración como "3d 5h 1m" si se gasta por tiempo), y avisa del cambio. */
    normalizeQuantity(): void {
        const unit = this.timeUnit()
        this.#quantity = unit ? normalizeDuration(this.#quantity, unit) : normalizeNumber(this.#quantity)
        this.notify()
    }

    /**
     * Da las celdas de datos de la fila, normalizadas sin cambiar la línea.
     * @returns Las celdas, en el orden de `COLUMNS` sin «= Coste».
     */
    serialize(): string[] {
        const unit = this.timeUnit()
        return [
            this.counts ? 'sí' : 'no',
            this.name,
            LINE_TYPE_LABELS[this.#type],
            LINE_TYPE_RULES[this.#type].format(this).trim(),
            unit ? normalizeDuration(this.#quantity, unit) : normalizeNumber(this.#quantity),
            this.category,
        ]
    }

    /**
     * Copia la línea, sin sus suscripciones.
     * @returns La copia.
     */
    clone(): Line {
        const copy = new Line()
        copy.setCategory(this.category)
        copy.counts = this.counts
        copy.name = this.name
        copy.#type = this.#type
        copy.#price = this.#price
        copy.#size = this.#size
        copy.#unit = this.#unit
        copy.#watts = this.#watts
        copy.#quantity = this.#quantity
        return copy
    }

    /**
     * Lee una fila de la tabla de líneas y la normaliza.
     * @param reader Lector de la hoja, con las columnas de `COLUMNS` ya leídas.
     * @returns La línea.
     */
    static deserialize(reader: DocumentReader): Line {
        const values = reader.cells()
        const type = (Object.keys(LINE_TYPE_LABELS) as LineType[]).find((t) => LINE_TYPE_LABELS[t] === values.type)
        if (!type) {
            return reader.fail(`en Tipo uno de: ${Object.values(LINE_TYPE_LABELS).join(', ')}`)
        }
        const line = new Line()
        line.readCommon(values, reader)
        line.#type = type
        line.#readPrice(values.price, reader)
        line.#quantity = values.quantity
        line.normalizeQuantity()
        return line
    }

    /**
     * Toma las partes del precio de la celda Precio, según el tipo.
     * @param cell Celda Precio.
     * @param reader Lector de la hoja, para el error.
     * @throws {ParseError} Si la celda no encaja con el tipo.
     */
    #readPrice(cell: string, reader: DocumentReader): void {
        const rules = LINE_TYPE_RULES[this.#type]
        const match = cell.match(rules.pattern)
        if (!match) {
            reader.fail(rules.expected)
        }
        const parts: PriceParts = { price: '', size: '', unit: '', watts: '' }
        rules.parts.forEach((part, i) => {
            parts[part] = (match[i + 1] ?? '').trim()
        })
        this.#price = normalizeNumber(parts.price)
        this.#size = normalizeNumber(parts.size)
        this.#unit = parts.unit
        this.#watts = normalizeNumber(parts.watts)
    }
}

Line satisfies SerializableClass<Line>

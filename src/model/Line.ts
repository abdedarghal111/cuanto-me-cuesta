/**
 * @file Línea de gasto: sus valores, su coste y cómo se normaliza según su tipo.
 */

import { LineItem } from './LineItem.ts'
import { LINE_TYPE_LABELS, type LineType } from './LineType.ts'
import type { SerializableClass } from './SerializableClass.ts'
import { Column } from './text/Column.ts'
import type { DocumentReader } from './text/DocumentReader.ts'
import {
    TIME_UNIT_SECONDS, durationSeconds, formatNumber, normalizeDuration, normalizeNumber, parseNumber, timeUnit,
} from './text/numbers.ts'

/** Valores de texto de una línea que dependen de su tipo. */
interface LineValues {
    price: string
    per: string
    unit: string
    usage: string
}

/** Valores numéricos con los que se calcula el coste de una línea. */
interface CostInputs {
    price: number
    per: number
    usage: number
}

/** Comportamiento de un tipo de línea. */
interface LineTypeRules {
    /** Precio, Por, Unidad y Consumo normalizados. */
    normalize(line: Line): LineValues
    /** Precio, Por y Consumo como números, con sus valores por defecto. */
    costInputs(line: Line): CostInputs
    /** Valores que cambian al elegir este tipo para una línea; los que no da se quedan igual. */
    onSelect(line: Line): Partial<LineValues>
}

/** Reglas de cada tipo. Un tipo nuevo solo necesita su entrada aquí y en `LineType`. */
const LINE_TYPE_RULES: Record<LineType, LineTypeRules> = {
    number: {
        normalize: (line) => ({
            price: normalizeNumber(line.price),
            per: normalizeNumber(line.per),
            unit: line.unit.trim(),
            usage: normalizeNumber(line.usage),
        }),
        costInputs: (line) => ({ price: parseNumber(line.price) ?? 0, per: parseNumber(line.per) ?? 1, usage: parseNumber(line.usage) ?? 0 }),
        onSelect: () => ({}),
    },
    time: {
        normalize: (line) => {
            const unit = timeUnit(line.unit)
            // Un Por en horas:minutos ("3000:00") pasa a número.
            const per = parseNumber(line.per, true)
            return {
                price: normalizeNumber(line.price),
                per: per === null ? line.per.trim() : formatNumber(per),
                unit,
                usage: normalizeDuration(line.usage, unit),
            }
        },
        // El Consumo se pasa a la unidad de la línea.
        costInputs: (line) => ({
            price: parseNumber(line.price) ?? 0,
            per: parseNumber(line.per, true) ?? 1,
            usage: (durationSeconds(line.usage, line.unit) ?? 0) / TIME_UNIT_SECONDS[timeUnit(line.unit)],
        }),
        // La Unidad queda en d, h o min.
        onSelect: (line) => ({ unit: timeUnit(line.unit) }),
    },
    fixed: {
        normalize: (line) => ({ price: '1', per: '1', unit: line.unit.trim(), usage: normalizeNumber(line.usage) }),
        costInputs: (line) => ({ price: 1, per: 1, usage: parseNumber(line.usage) ?? 0 }),
        // Precio y Por pasan a 1, y una Unidad vacía pasa a €.
        onSelect: (line) => ({ price: '1', per: '1', unit: line.unit.trim() || '€' }),
    },
}

/**
 * Línea de gasto, en blanco y de tipo número al crearse. Los números se guardan como texto tal cual se escriben
 * ("11,21", "0,5", "15:08").
 */
export class Line extends LineItem {
    /** Columnas de la tabla de líneas de una sección. */
    static readonly COLUMNS: Column[] = [
        new Column('Cuenta', 'counts'),
        new Column('Concepto', 'name'),
        new Column('Tipo', 'type'),
        new Column('Precio €', 'price', true),
        new Column('Por', 'per', true),
        new Column('Unidad', 'unit'),
        new Column('Consumo', 'usage', true),
        new Column('Multiplicador', 'multiplier', true),
        new Column('Categoría', 'category'),
        new Column('= Coste', 'cost'),
    ]

    #type: LineType = 'number'
    #price = ''
    #per = '1'
    #unit = ''
    #usage = ''
    #multiplier = '1'

    /**
     * Tipo: cómo se escriben Por y Consumo. Al cambiarlo se aplican las reglas del tipo nuevo: `fixed` pone Precio
     * y Por a 1 y una Unidad vacía a €, y `time` deja la Unidad en d, h o min. Al leer un archivo no se aplican.
     */
    get type(): LineType {
        return this.#type
    }

    /**
     * Cambia el tipo, aplica las reglas del tipo nuevo y avisa una sola vez.
     * @param type Tipo nuevo.
     */
    set type(type: LineType) {
        this.#type = type
        const values = LINE_TYPE_RULES[type].onSelect(this)
        this.#price = values.price ?? this.#price
        this.#per = values.per ?? this.#per
        this.#unit = values.unit ?? this.#unit
        this.#usage = values.usage ?? this.#usage
        this.notify()
    }

    /** Precio, en €. */
    get price(): string {
        return this.#price
    }

    set price(price: string) {
        this.#price = price
        this.notify()
    }

    /** Cantidad a la que corresponde el precio; vacío vale 1. */
    get per(): string {
        return this.#per
    }

    set per(per: string) {
        this.#per = per
        this.notify()
    }

    /** Texto libre para leer la línea (g, m, l, uds…); en `time` es d, h o min. */
    get unit(): string {
        return this.#unit
    }

    set unit(unit: string) {
        this.#unit = unit
        this.notify()
    }

    /** Consumo: un número, una duración o un importe, según el tipo. */
    get usage(): string {
        return this.#usage
    }

    set usage(usage: string) {
        this.#usage = usage
        this.notify()
    }

    /** Cuántas veces se repite el consumo; vacío vale 1. Admite decimales. */
    get multiplier(): string {
        return this.#multiplier
    }

    set multiplier(multiplier: string) {
        this.#multiplier = multiplier
        this.notify()
    }

    /**
     * Coste = Precio / Por × Consumo × Multiplicador. En `fixed`, Consumo × Multiplicador; en `time`, el Consumo
     * se pasa a la unidad de la línea.
     * @returns El coste en €.
     */
    cost(): number {
        const { price, per, usage } = LINE_TYPE_RULES[this.#type].costInputs(this)
        return per === 0 ? 0 : (price / per) * usage * (parseNumber(this.#multiplier) ?? 1)
    }

    /** Normaliza Precio, Por, Unidad, Consumo y Multiplicador según el tipo, y avisa del cambio. */
    normalize(): void {
        const values = this.#normalized()
        this.#price = values.price
        this.#per = values.per
        this.#unit = values.unit
        this.#usage = values.usage
        this.#multiplier = values.multiplier
        this.notify()
    }

    /** Normaliza solo el Consumo según el tipo (en `time`, una duración como "3d 5h 1m"), y avisa del cambio. */
    normalizeUsage(): void {
        this.#usage = LINE_TYPE_RULES[this.#type].normalize(this).usage
        this.notify()
    }

    /**
     * Da las celdas de datos de la fila, normalizadas sin cambiar la línea.
     * @returns Las celdas, en el orden de `COLUMNS` sin «= Coste».
     */
    serialize(): string[] {
        const values = this.#normalized()
        return [
            this.counts ? 'sí' : 'no',
            this.name,
            LINE_TYPE_LABELS[this.#type],
            values.price,
            values.per,
            values.unit,
            values.usage,
            values.multiplier,
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
        copy.#per = this.#per
        copy.#unit = this.#unit
        copy.#usage = this.#usage
        copy.#multiplier = this.#multiplier
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
            reader.fail(`en Tipo uno de: ${Object.values(LINE_TYPE_LABELS).join(', ')}`)
        }
        const line = new Line()
        line.readCommon(values, reader)
        line.#type = type
        line.#price = values.price
        line.#per = values.per
        line.#unit = values.unit
        line.#usage = values.usage
        line.#multiplier = values.multiplier
        line.normalize()
        return line
    }

    /** Valores normalizados según el tipo, sin cambiar la línea. */
    #normalized(): LineValues & { multiplier: string } {
        return { ...LINE_TYPE_RULES[this.#type].normalize(this), multiplier: normalizeNumber(this.#multiplier) }
    }
}

Line satisfies SerializableClass<Line>

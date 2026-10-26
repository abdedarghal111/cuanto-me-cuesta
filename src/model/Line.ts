/**
 * @file Línea de gasto: el precio de una unidad, escrito según su tipo, por la Cantidad.
 */

import { LineItem } from './LineItem.ts'
import { LINE_TYPE_LABELS, type BasicLineType, type LineType } from './LineType.ts'
import type { Section } from './Section.ts'
import type { SerializableClass } from './SerializableClass.ts'
import { Column } from './text/Column.ts'
import type { DocumentReader } from './text/DocumentReader.ts'
import {
    TIME_UNIT_SECONDS, durationSeconds, isTimeUnit, normalizeDuration, normalizeNumber, parseNumber, type TimeUnit,
} from './text/numbers.ts'

/** Datos con los que se calcula un grupo función: el valor de cada dato, por su nombre. */
export type Args = Record<string, string>

/** Partes del precio de una línea, como texto. */
interface PriceParts {
    price: string
    size: string
    unit: string
    watts: string
}

/** Comportamiento de un tipo de línea básico. */
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

/** Reglas de cada tipo básico. Un tipo nuevo solo necesita su entrada aquí y en `LineType`. */
const LINE_TYPE_RULES: Record<BasicLineType, LineTypeRules> = {
    fixed: {
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

/** Separador de los datos en la celda Precio de una línea de tipo función. */
const ARGS_SEPARATOR = ' · '

/**
 * Línea de gasto, en blanco y de tipo fijo al crearse. Coste = precio de una unidad × Cantidad. Los números se
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

    #type: LineType = 'fixed'
    #price = ''
    #size = ''
    #unit = ''
    #watts = ''
    #quantity = ''
    /** Grupo función al que llama (`function`). */
    #function: Section | null = null
    #args: Args = {}
    /** Tipo y Precio leídos de una línea de tipo función, hasta que `CostSheet` la enlaza con su grupo. */
    #pending: { name: string; price: string; lineNumber: number } | null = null

    /** Tipo: cómo se escribe el precio de una unidad. Para llamar a un grupo función se usa `call()`. */
    get type(): LineType {
        return this.#type
    }

    set type(type: BasicLineType) {
        this.#type = type
        this.#function = null
        this.notify()
    }

    /** Precio en €: de una unidad (`fixed`), del lote (`lot`), de una hora (`hours`) o del kWh (`power`). */
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

    /**
     * Cantidad: un número, o una duración si el tipo se gasta por tiempo. Dentro de un grupo función puede ser el
     * nombre de uno de sus datos.
     */
    get quantity(): string {
        return this.#quantity
    }

    set quantity(quantity: string) {
        this.#quantity = quantity
        this.notify()
    }

    /** Grupo función al que llama, o `null` si no es de tipo `function`. */
    get function(): Section | null {
        return this.#function
    }

    /**
     * Pasa a llamar a un grupo función y avisa. Los datos que ya tenía se quedan.
     * @param section Grupo función.
     */
    call(section: Section): void {
        this.#type = 'function'
        this.#function = section
        this.notify()
    }

    /**
     * Valor de un dato del grupo función.
     * @param name Nombre del dato.
     * @returns El valor, o `''` si no lo tiene.
     */
    arg(name: string): string {
        return this.#args[name] ?? ''
    }

    /**
     * Cambia el valor de un dato del grupo función y avisa.
     * @param name Nombre del dato.
     * @param value Valor nuevo.
     */
    setArg(name: string, value: string): void {
        this.#args = { ...this.#args, [name]: value }
        this.notify()
    }

    /**
     * Cambia el nombre de un dato, conservando su valor. Lo usa `CostSheet` al renombrar el dato en su grupo.
     * @param from Nombre anterior.
     * @param to Nombre nuevo.
     */
    renameArg(from: string, to: string): void {
        const { [from]: value, ...rest } = this.#args
        this.#args = value === undefined ? rest : { ...rest, [to]: value }
        this.notify()
    }

    /**
     * Unidad de tiempo de la Cantidad.
     * @returns d, h o min si la Cantidad es una duración; si no, `null`.
     */
    timeUnit(): TimeUnit | null {
        return this.#type === 'function' ? null : LINE_TYPE_RULES[this.#type].timeUnit(this)
    }

    /**
     * Unidad en la que se cuenta la Cantidad, para leer el precio de una unidad («€/g»).
     * @returns h si se gasta por tiempo, la del lote, o ud.
     */
    unitLabel(): string {
        return this.timeUnit() ?? ((this.#type === 'lot' && this.#unit.trim()) || 'ud')
    }

    /**
     * Precio de una unidad: de una pieza, de una unidad del lote, de una hora o el total del grupo función.
     * @returns El precio en €.
     */
    unitPrice(): number {
        if (this.#type === 'function') {
            return this.#function?.subtotal(this.#args) ?? 0
        }
        return LINE_TYPE_RULES[this.#type].unitPrice(this)
    }

    /**
     * Cantidad como número; una duración, en la unidad de tiempo de la línea.
     * @param args Datos del grupo función que se calcula; si la Cantidad es uno de ellos, se toma su valor.
     * @returns La cantidad, o 0 si está vacía o no es válida.
     */
    amount(args?: Args): number {
        const quantity = args && Object.hasOwn(args, this.#quantity.trim()) ? args[this.#quantity.trim()] : this.#quantity
        const unit = this.timeUnit()
        if (unit) {
            return (durationSeconds(quantity, unit) ?? 0) / TIME_UNIT_SECONDS[unit]
        }
        return parseNumber(quantity) ?? 0
    }

    /**
     * Coste = precio de una unidad × Cantidad.
     * @param args Datos del grupo función que se calcula, si la línea es de uno.
     * @returns El coste en €.
     */
    cost(args?: Args): number {
        return this.unitPrice() * this.amount(args)
    }

    /**
     * Reparto del coste por categoría. Una línea de tipo función reparte el de su grupo.
     * @param args Datos del grupo función que se calcula, si la línea es de uno.
     * @returns El importe de cada categoría.
     */
    byCategory(args?: Args): Map<string, number> {
        if (this.#type !== 'function' || !this.#function) {
            return new Map([[this.category, this.cost(args)]])
        }
        const amount = this.amount(args)
        return new Map([...this.#function.byCategory(this.#args)].map(([category, value]) => [category, value * amount]))
    }

    /** Normaliza solo la Cantidad (una duración como "3d 5h 1m" si se gasta por tiempo), y avisa del cambio. */
    normalizeQuantity(): void {
        this.#quantity = this.#normalizedQuantity()
        this.notify()
    }

    /**
     * Normaliza el valor de un dato del grupo función (una duración si el dato es de tiempo), y avisa del cambio.
     * @param name Nombre del dato.
     */
    normalizeArg(name: string): void {
        const value = this.arg(name)
        this.setArg(name, this.#function?.isTimeParam(name) ? normalizeDuration(value, 'h') : normalizeNumber(value))
    }

    /**
     * Da las celdas de datos de la fila, normalizadas sin cambiar la línea.
     * @returns Las celdas, en el orden de `COLUMNS` sin «= Coste».
     */
    serialize(): string[] {
        const fn = this.#function
        if (this.#type === 'function' && fn) {
            const args = fn.params.map((param) => `${param} ${this.arg(param).trim()}`.trim())
            return [this.counts ? 'sí' : 'no', this.name, fn.title, args.join(ARGS_SEPARATOR), this.#normalizedQuantity(), '']
        }
        const type = this.#type === 'function' ? 'fixed' : this.#type
        return [
            this.counts ? 'sí' : 'no',
            this.name,
            LINE_TYPE_LABELS[type],
            LINE_TYPE_RULES[type].format(this).trim(),
            this.#normalizedQuantity(),
            this.category,
        ]
    }

    /**
     * Copia la línea, sin sus suscripciones. La copia llama al mismo grupo función.
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
        copy.#function = this.#function
        copy.#args = { ...this.#args }
        return copy
    }

    /**
     * Enlaza una línea leída de tipo función con su grupo y toma sus datos de la celda Precio. Las demás no cambian.
     * @param functions Grupos función de la hoja.
     * @param reader Lector de la hoja, para los errores.
     * @throws {ParseError} Si no hay un grupo función con ese título o un dato no es de él.
     */
    link(functions: Section[], reader: DocumentReader): void {
        const pending = this.#pending
        if (!pending) {
            return
        }
        reader.lineNumber = pending.lineNumber
        const fn = functions.find((section) => section.title === pending.name)
        if (!fn) {
            const names = [...Object.values(LINE_TYPE_LABELS), ...functions.map((section) => section.title)]
            reader.fail(`en Tipo uno de: ${names.join(', ')}`)
        }
        const args: Args = {}
        for (const part of pending.price.split('·').map((p) => p.trim()).filter(Boolean)) {
            const param = fn.params.find((p) => part === p || part.startsWith(`${p} `))
            if (!param) {
                reader.fail(`en Precio los datos de «${fn.title}» separados por «·» («${fn.params.map((p) => `${p} 1`).join(ARGS_SEPARATOR)}»)`)
            }
            args[param] = part.slice(param.length).trim()
        }
        this.#pending = null
        this.#function = fn
        this.#args = args
        for (const param of fn.params) {
            this.normalizeArg(param)
        }
    }

    /**
     * Cambia el grupo función al que llama por otro, sin avisar. Lo usa `CostSheet` al copiar grupos.
     * @param map Grupo de antes → grupo nuevo; si el suyo no está, no cambia.
     */
    relink(map: Map<Section, Section>): void {
        this.#function = (this.#function && map.get(this.#function)) ?? this.#function
    }

    /**
     * Lee una fila de la tabla de líneas y la normaliza. Si el Tipo no es básico, es una línea de tipo función que
     * `link()` enlaza después con su grupo.
     * @param reader Lector de la hoja, con las columnas de `COLUMNS` ya leídas.
     * @returns La línea.
     */
    static deserialize(reader: DocumentReader): Line {
        const values = reader.cells()
        const line = new Line()
        line.readCommon(values, reader)
        line.#quantity = values.quantity
        const type = (Object.keys(LINE_TYPE_LABELS) as BasicLineType[]).find((t) => LINE_TYPE_LABELS[t] === values.type)
        if (type) {
            line.#type = type
            line.#readPrice(type, values.price, reader)
        } else {
            line.#type = 'function'
            line.#pending = { name: values.type, price: values.price, lineNumber: reader.lineNumber }
        }
        line.normalizeQuantity()
        return line
    }

    /** Cantidad normalizada según el tipo, sin cambiar la línea; el nombre de un dato queda igual. */
    #normalizedQuantity(): string {
        const unit = this.timeUnit()
        return unit ? normalizeDuration(this.#quantity, unit) : normalizeNumber(this.#quantity)
    }

    /**
     * Toma las partes del precio de la celda Precio, según el tipo.
     * @param type Tipo de la línea.
     * @param cell Celda Precio.
     * @param reader Lector de la hoja, para el error.
     * @throws {ParseError} Si la celda no encaja con el tipo.
     */
    #readPrice(type: BasicLineType, cell: string, reader: DocumentReader): void {
        const rules = LINE_TYPE_RULES[type]
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

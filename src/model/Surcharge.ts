/**
 * @file Recargo en porcentaje: de su sección o sobre el total.
 */

import { LineItem } from './LineItem.ts'
import type { SerializableClass } from './SerializableClass.ts'
import { Column } from './text/Column.ts'
import type { DocumentReader } from './text/DocumentReader.ts'
import { normalizeNumber, parseNumber } from './text/numbers.ts'

/** Columnas de los recargos de una sección. */
const SECTION_COLUMNS = [
    new Column('Cuenta', 'counts'),
    new Column('Concepto', 'name'),
    new Column('%', 'percent', true),
    new Column('Categoría', 'category'),
    new Column('= Coste', 'cost', true),
]

/** Columnas de los recargos sobre el total. */
const GLOBAL_COLUMNS = [
    ...SECTION_COLUMNS.slice(0, 4),
    new Column('= Importe', 'amount', true),
    new Column('= Acumulado', 'runningTotal', true),
]

/** Recargo en porcentaje: en una sección, sobre su base; sobre el total, sobre lo acumulado. */
export class Surcharge extends LineItem {
    /** Si va sobre el total (`true`) o sobre su sección (`false`). */
    readonly global: boolean
    #percent = ''

    /**
     * Crea un recargo en blanco y sin categoría.
     * @param global Si va sobre el total.
     */
    constructor(global: boolean) {
        super()
        this.global = global
    }

    /** Porcentaje, como texto ("15"). */
    get percent(): string {
        return this.#percent
    }

    set percent(percent: string) {
        this.#percent = percent
        this.notify()
    }

    /**
     * Importe del recargo.
     * @param base Importe sobre el que se aplica: la base de la sección o lo acumulado.
     * @returns Su porcentaje de `base`.
     */
    amount(base: number): number {
        return ((parseNumber(this.#percent) ?? 0) / 100) * base
    }

    /**
     * Da las celdas de datos de la fila.
     * @returns Cuenta, Concepto, % y Categoría.
     */
    serialize(): string[] {
        return [this.counts ? 'sí' : 'no', this.name, normalizeNumber(this.#percent), this.category]
    }

    /**
     * Copia el recargo, sin sus suscripciones.
     * @returns La copia.
     */
    clone(): Surcharge {
        const copy = new Surcharge(this.global)
        copy.setCategory(this.category)
        copy.counts = this.counts
        copy.name = this.name
        copy.#percent = this.#percent
        return copy
    }

    /**
     * Columnas de la tabla de recargos.
     * @param global Si son los recargos sobre el total.
     * @returns Las columnas de la tabla que le corresponde.
     */
    static columns(global: boolean): Column[] {
        return global ? GLOBAL_COLUMNS : SECTION_COLUMNS
    }

    /**
     * Lee una fila de una tabla de recargos.
     * @param reader Lector de la hoja, con las columnas de `columns(global)` ya leídas.
     * @param global Si es un recargo sobre el total.
     * @returns El recargo.
     */
    static deserialize(reader: DocumentReader, global = false): Surcharge {
        const values = reader.cells()
        const surcharge = new Surcharge(global)
        surcharge.readCommon(values, reader)
        surcharge.#percent = normalizeNumber(values.percent)
        return surcharge
    }
}

Surcharge satisfies SerializableClass<Surcharge>

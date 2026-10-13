/**
 * @file Lo común de las líneas de gasto y los recargos: si cuentan, su concepto y su categoría.
 */

import type { Categorizable } from './Categorizable.ts'
import { Category } from './Category.ts'
import type { Observable } from './Observable.ts'
import type { Serializable } from './Serializable.ts'
import type { DocumentReader } from './text/DocumentReader.ts'

/** Fila de una tabla de la hoja: una línea de gasto o un recargo. Avisa de cada cambio con `notify()`. */
export abstract class LineItem implements Categorizable, Serializable, Observable {
    #counts = true
    #name = ''
    #category = ''
    #listeners = new Set<() => void>()

    /** Si suma; si es `false`, se muestra sin sumar. */
    get counts(): boolean {
        return this.#counts
    }

    set counts(counts: boolean) {
        this.#counts = counts
        this.notify()
    }

    /** Concepto de la fila. */
    get name(): string {
        return this.#name
    }

    set name(name: string) {
        this.#name = name
        this.notify()
    }

    /** Categoría de la fila; vacía es «Sin categoría». Se cambia con `CostSheet.assignCategory()`. */
    get category(): string {
        return this.#category
    }

    /**
     * Da la categoría.
     * @returns La categoría.
     */
    getCategory(): string {
        return this.#category
    }

    /**
     * Cambia la categoría sin comprobarla y avisa. Interno: solo lo usa `CostSheet`.
     * @param category Categoría nueva.
     */
    setCategory(category: string): void {
        this.#category = category
        this.notify()
    }

    /**
     * Da las celdas de datos de la fila, sin las calculadas.
     * @returns Las celdas, en el orden de las columnas.
     */
    abstract serialize(): string[]

    /**
     * Suscribe una función a los cambios de la fila.
     * @param listener Función que se llama en cada cambio.
     * @returns Función que anula la suscripción.
     */
    subscribe(listener: () => void): () => void {
        this.#listeners.add(listener)
        return () => {
            this.#listeners.delete(listener)
        }
    }

    /** Avisa a los suscritos de que la fila ha cambiado. */
    notify(): void {
        for (const listener of this.#listeners) {
            listener()
        }
    }

    /**
     * Toma Cuenta, Concepto y Categoría de una fila leída.
     * @param values Celdas de la fila, por clave de columna.
     * @param reader Lector de la hoja, para las categorías declaradas y los errores.
     */
    protected readCommon(values: Record<string, string>, reader: DocumentReader): void {
        if (values.counts !== 'sí' && values.counts !== 'no') {
            reader.fail('«sí» o «no» en Cuenta')
        }
        const category = Category.clean(values.category)
        if (category && !reader.categories.includes(category)) {
            reader.fail(`en Categoría una de las de «Categorías:» (no está «${category}»)`)
        }
        this.#counts = values.counts === 'sí'
        this.#name = values.name
        this.#category = category
    }
}

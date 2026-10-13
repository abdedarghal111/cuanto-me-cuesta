/**
 * @file Interfaz del lado estático de las clases que se leen del texto de una hoja.
 */

import type { DocumentReader } from './text/DocumentReader.ts'

/**
 * Clase que se lee del texto de una hoja con su `static deserialize`. `CostSheet`, `Section`, `Line` y `Surcharge`
 * la cumplen, comprobado con `satisfies`.
 */
export interface SerializableClass<T> {
    /**
     * Lee un objeto desde la posición actual del lector.
     * @param reader Lector de la hoja.
     * @returns El objeto leído.
     */
    deserialize(reader: DocumentReader): T
}

/**
 * @file Interfaz de los objetos del modelo que se escriben en el texto de una hoja.
 */

/**
 * Objeto que se escribe en el texto de una hoja. Los compuestos (`CostSheet`, `Section`) dan líneas de texto;
 * las hojas (`Line`, `Surcharge`) dan las celdas de datos de su fila, que el compuesto alinea con `Table`.
 */
export interface Serializable {
    /**
     * Escribe el objeto.
     * @returns Líneas de texto o celdas de una fila, según el objeto.
     */
    serialize(): string[]
}

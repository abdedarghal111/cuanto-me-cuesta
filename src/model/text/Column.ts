/**
 * @file Columna de una tabla del archivo: su título, su clave en el código y su alineación.
 */

/** Columna de una tabla. Las que empiezan por «=» son calculadas: se escriben y no se leen. */
export class Column {
    /** Título en la fila de títulos («Precio €», «= Coste»). */
    title: string
    /** Clave en el código («price», «cost»). */
    key: string
    /** Si se alinea a la derecha, como los números. */
    rightAligned: boolean

    /**
     * Crea una columna.
     * @param title Título en la fila de títulos.
     * @param key Clave en el código.
     * @param rightAligned Si se alinea a la derecha.
     */
    constructor(title: string, key: string, rightAligned = false) {
        this.title = title
        this.key = key
        this.rightAligned = rightAligned
    }
}

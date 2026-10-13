/**
 * @file Error del lector estricto: dice en qué línea falla un archivo, qué pone y qué se esperaba.
 */

/** Fallo al leer una hoja: el primero que encuentra `DocumentReader`. */
export class ParseError extends Error {
    /** Número de la línea que falla, empezando por 1. */
    readonly lineNumber: number
    /** Texto de la línea que falla; vacío al final del archivo. */
    readonly line: string
    /** Lo que se esperaba en esa línea. */
    readonly expected: string

    /**
     * Crea el error con un mensaje para mostrar al usuario.
     * @param lineNumber Número de la línea, empezando por 1.
     * @param line Texto de la línea.
     * @param expected Lo que se esperaba.
     */
    constructor(lineNumber: number, line: string, expected: string) {
        super(`Línea ${lineNumber}: se esperaba ${expected}, pero pone «${line}».`)
        this.name = 'ParseError'
        this.lineNumber = lineNumber
        this.line = line
        this.expected = expected
    }
}

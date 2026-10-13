/**
 * @file Delimitadores de las partes de una hoja. Cada valor es el texto con el que empieza su línea.
 */

/** Delimitadores de una hoja, en el orden en que aparecen. Cada título cierra la parte anterior. */
export const Delimiter = {
    /** `# Nombre`: abre la hoja; le siguen `Fecha:` y `Categorías:`. */
    SHEET: '#',
    /** Bloque ` ```observaciones ` … ` ``` `, el único que lleva cierre. */
    OBSERVATIONS: 'observaciones',
    /** `## Título`: abre una sección. */
    SECTION: '##',
    /** `### Recargos`: los recargos de la sección. */
    SURCHARGES: '### Recargos',
    /** `# Sobre el total`: los recargos globales. */
    TOTAL: '# Sobre el total',
    /** `# Resumen`: fin de lo que se lee. */
    SUMMARY: '# Resumen',
    /** `# Instrucciones`: normas para quien edite el archivo. */
    INSTRUCTIONS: '# Instrucciones',
} as const

/** Uno de los delimitadores de `Delimiter`. */
export type Delimiter = (typeof Delimiter)[keyof typeof Delimiter]

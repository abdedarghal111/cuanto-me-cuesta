/**
 * @file Tipos de línea y su nombre en el archivo y en la pantalla.
 */

/**
 * Tipo de una línea: cómo se escriben «Por» y «Consumo».
 * `number`: números con decimales; `time`: la Unidad es d, h o min, Por es un número en esa unidad y el Consumo
 * una duración ("3d 5h 1m 3s"); `fixed`: Precio y Por valen 1 y el Consumo es el importe en €.
 */
export type LineType = 'number' | 'time' | 'fixed'

/** Nombre de cada tipo en el archivo y en la pantalla. */
export const LINE_TYPE_LABELS: Record<LineType, string> = { number: 'número', time: 'tiempo', fixed: 'fijo' }

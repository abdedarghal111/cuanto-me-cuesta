/**
 * @file Tipos de línea y su nombre en el archivo y en la pantalla.
 */

/**
 * Tipo de una línea: cómo se escribe el precio de una unidad.
 * `common`: el precio ("6,5 €"); `lot`: lo que costó un lote y lo que trae ("4,2 € por 20 ud");
 * `hours`: el precio de una hora ("12 €/h"); `power`: la potencia y el precio de la luz ("140 W a 0,20 €/kWh").
 */
export type LineType = 'common' | 'lot' | 'hours' | 'power'

/** Nombre de cada tipo en el archivo y en la pantalla. */
export const LINE_TYPE_LABELS: Record<LineType, string> = { common: 'común', lot: 'lote', hours: 'horas', power: 'luz' }

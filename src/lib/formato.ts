/**
 * @file Formato de los archivos de producto y de plantilla: lectura, escritura y cuentas.
 * Reúne la API pública de los módulos de `formato/`, para importarla desde un solo sitio.
 */

export { fileName, today } from './formato/archivo.ts'
export { UNTAGGED, cleanTag, parseTagList, usedTags } from './formato/categorias.ts'
export { productToText } from './formato/escritura.ts'
export { TEMPLATE_INSTRUCTIONS } from './formato/instrucciones.ts'
export { parseProduct, parseTemplate } from './formato/lectura.ts'
export { lineCost, surchargeAmount } from './formato/lineas.ts'
export {
    LINE_TYPE_LABELS, emptyLine, emptySurcharge, type Line, type LineType, type Product, type Section, type Surcharge, type Template,
} from './formato/modelo.ts'
export {
    TIME_UNIT_SECONDS, formatEuros, formatNumber, formatPercent, normalizeDuration, parseNumber, durationSeconds, timeUnit,
} from './formato/numeros.ts'
export { summarize, type Summary } from './formato/resumen.ts'

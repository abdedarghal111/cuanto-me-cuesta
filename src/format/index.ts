/**
 * @file Formato de los archivos de producto y de plantilla: lectura, escritura y cuentas.
 * Reúne la API pública de los módulos de `format/`, para importarla desde un solo sitio.
 */

export { fileName, today } from './files.ts'
export { UNTAGGED, cleanTag, parseTagList, usedTags } from './tags.ts'
export { productToText } from './writer.ts'
export { TEMPLATE_INSTRUCTIONS } from './instructions.ts'
export { parseProduct, parseTemplate } from './parser.ts'
export { lineCost, surchargeAmount } from './lines.ts'
export {
    LINE_TYPE_LABELS, emptyLine, emptySurcharge, type Line, type LineType, type Product, type Section, type Surcharge, type Template,
} from './model.ts'
export {
    TIME_UNIT_SECONDS, formatEuros, formatNumber, formatPercent, normalizeDuration, parseNumber, durationSeconds, timeUnit,
} from './numbers.ts'
export { summarize, type Summary } from './summary.ts'

/**
 * @file Formato de los archivos de producto y de plantilla: lectura, escritura y cuentas.
 * Reúne la API pública de los módulos de `format/`, para importarla desde un solo sitio.
 */

export { fileName, today } from './format/files.ts'
export { UNTAGGED, cleanTag, parseTagList, usedTags } from './format/tags.ts'
export { productToText } from './format/writer.ts'
export { TEMPLATE_INSTRUCTIONS } from './format/instructions.ts'
export { parseProduct, parseTemplate } from './format/parser.ts'
export { lineCost, surchargeAmount } from './format/lines.ts'
export {
    LINE_TYPE_LABELS, emptyLine, emptySurcharge, type Line, type LineType, type Product, type Section, type Surcharge, type Template,
} from './format/model.ts'
export {
    TIME_UNIT_SECONDS, formatEuros, formatNumber, formatPercent, normalizeDuration, parseNumber, durationSeconds, timeUnit,
} from './format/numbers.ts'
export { summarize, type Summary } from './format/summary.ts'

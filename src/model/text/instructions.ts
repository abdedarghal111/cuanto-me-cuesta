/**
 * @file Instrucciones que se escriben al final de cada hoja, tras «# Instrucciones», para quien la edite a mano.
 */

/** Normas imperativas, claras y sencillas para editar una hoja; la app las reescribe al guardar. */
export const SHEET_INSTRUCTIONS = [
    '- Edita solo lo que hay antes de «# Resumen». El resumen y estas instrucciones los rehace la app al guardar.',
    '- Mantén el orden: título, Fecha, Categorías, observaciones, secciones y «# Sobre el total».',
    '- Escribe el nombre de la hoja detrás de «# » en la primera línea.',
    '- Escribe la fecha como AAAA-MM-DD.',
    '- Escribe en Categorías todas las que uses, separadas por comas.',
    '- Escribe las observaciones entre ```observaciones y ```. Dentro puedes poner lo que quieras.',
    '- Abre cada sección con «## Título». Sus recargos van debajo, con «### Recargos».',
    '- Escribe una fila por gasto, con las columnas en el orden de la fila de títulos.',
    '- Escribe los números con coma decimal y sin punto de miles. No uses fórmulas.',
    '- Pon «sí» en Cuenta para que sume y «no» para que se vea sin sumar.',
    '- Elige el Tipo:',
    '    número: Consumo es un número (228,4).',
    '    tiempo: Unidad d, h o min; Consumo es una duración (3d 5h 1m 3s o 15:08).',
    '    fijo:   escribe el importe en Consumo; Precio y Por valen 1.',
    '- Calcula así: Coste = Precio / Por × Consumo × Multiplicador.',
    '- Cada recargo de sección es un % de la suma de las líneas que suman en esa sección.',
    '- Los recargos de «# Sobre el total» se aplican en orden, cada uno sobre lo acumulado.',
    '- Si un texto lleva | escribe \\|. Si una categoría lleva una coma escribe \\,. Si lleva \\ escribe \\\\.',
    '- No edites lo que empieza por «=» ni lo que va entre «(= …)»: lo calcula la app.',
]

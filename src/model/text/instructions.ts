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
    '- Elige el Tipo y escribe en Precio lo que cuesta una unidad:',
    '    fijo:  el precio de una unidad (6,5 €).',
    '    lote:  lo que costó el lote y lo que trae (4,2 € por 20 ud).',
    '    horas: el precio de una hora (12 €/h).',
    '    luz:   la potencia y el precio de la luz (140 W a 0,20 €/kWh).',
    '- Escribe en Cantidad cuántas unidades gastas (3 o 350). En horas, en luz y en un lote por d, h o min, escribe una duración (3d 5h 1m 3s o 15:08).',
    '- Calcula así: Coste = precio de una unidad × Cantidad.',
    '- Abre una receta con «## [Receta] Título (dato, dato)», con hasta 3 datos. No suma por sí sola. En Cantidad, sus líneas llevan el nombre de un dato o un número.',
    '- Para usar una receta, pon su título en Tipo, sus datos en Precio separados por « · » (tiempo 43m · gramos 9,6) y en Cantidad cuántas veces. Una unidad cuesta lo que la receta con esos datos, con sus recargos.',
    '- Cada recargo de sección es un % de la suma de las líneas que suman en esa sección.',
    '- Los recargos de «# Sobre el total» se aplican en orden, cada uno sobre lo acumulado.',
    '- Si un texto lleva | escribe \\|. Si una categoría lleva una coma escribe \\,. Si lleva \\ escribe \\\\.',
    '- No edites lo que empieza por «=» ni lo que va entre «(= …)»: lo calcula la app.',
]

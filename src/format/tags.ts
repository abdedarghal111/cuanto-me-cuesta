/**
 * @file Categorías (`tag` en el código): limpieza, listas y las que usa un producto.
 */

import type { Section, Surcharge } from './model.ts'

/** Categoría con la que se agrupan las líneas que no llevan ninguna. */
export const UNTAGGED = 'Sin categoría'

/** Quita de un nombre de categoría las comas y "|", que separan campos en el archivo. */
export const cleanTag = (tag: string) => tag.replace(/[,|]/g, ' ').replace(/\s+/g, ' ').trim()

/** Categorías separadas por comas, sin repetir: "Material, Luz ,, Luz" → ["Material", "Luz"]. */
export const parseTagList = (text: string) => [...new Set(text.split(',').map(cleanTag).filter(Boolean))]

/** Categorías que usan las líneas y recargos de los bloques y de `totalSurcharges`, en orden de aparición. */
export const usedTags = (sections: Section[], totalSurcharges: Surcharge[] = []) =>
    [...new Set([...sections.flatMap((s) => [...s.lines, ...s.surcharges]), ...totalSurcharges].map((item) => item.tag.trim()).filter(Boolean))]

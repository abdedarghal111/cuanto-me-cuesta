/**
 * @file Categorías (`tag` en el código): limpieza, listas y las que usa un documento.
 */

import type { Recargo, Seccion } from './modelo.ts'

/** Categoría con la que se agrupan las líneas que no llevan ninguna. */
export const SIN_TAG = 'Sin categoría'

/** Quita de un nombre de categoría las comas y "|", que separan campos en el archivo. */
export const limpiarTag = (t: string) => t.replace(/[,|]/g, ' ').replace(/\s+/g, ' ').trim()

/** Categorías separadas por comas, sin repetir: "Material, Luz ,, Luz" → ["Material", "Luz"]. */
export const listaDeTags = (texto: string) => [...new Set(texto.split(',').map(limpiarTag).filter(Boolean))]

/** Categorías que usan las líneas y recargos de los bloques y de `sobreTotal`, en orden de aparición. */
export const usados = (secciones: Seccion[], sobreTotal: Recargo[] = []) =>
    [...new Set([...secciones.flatMap((s) => [...s.lineas, ...s.recargos]), ...sobreTotal].map((l) => l.tag.trim()).filter(Boolean))]

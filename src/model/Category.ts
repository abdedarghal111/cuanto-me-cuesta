/**
 * @file Categorías: el nombre de «Sin categoría», limpiarlas, ordenarlas y leer y escribir la lista de «Categorías:».
 */

import { Table } from './text/Table.ts'

/** Todo lo de las categorías en un sitio. Solo tiene miembros estáticos. */
export class Category {
    /** Categoría con la que se agrupa lo que no lleva ninguna. */
    static readonly UNTAGGED = 'Sin categoría'

    private constructor() {}

    /**
     * Limpia el nombre de una categoría: un solo espacio entre palabras y ninguno en los extremos.
     * @param text Nombre escrito.
     * @returns El nombre limpio.
     */
    static clean(text: string): string {
        return text.replace(/\s+/g, ' ').trim()
    }

    /**
     * Ordena todas las categorías: las de la plantilla en su orden, seguidas de las demás por orden alfabético.
     * @param templateCategories Categorías de la plantilla, en su orden.
     * @param used Categorías usadas en las hojas; se ignoran las vacías y las repetidas.
     * @returns Las categorías en ese orden, sin repetir.
     */
    static sort(templateCategories: string[], used: Iterable<string>): string[] {
        const others = [...new Set(used)]
            .filter((category) => category && !templateCategories.includes(category))
            .sort((a, b) => a.localeCompare(b, 'es'))
        return [...templateCategories, ...others]
    }

    /**
     * Lee la lista de «Categorías:», separada por comas, sin repetir y sin vacías. Quita los escapes
     * `\,`, `\|` y `\\`.
     * @param text Texto tras «Categorías:».
     * @returns Las categorías.
     * @throws {Error} Si hay un escape no válido.
     */
    static parseList(text: string): string[] {
        const parts = ['']
        for (let i = 0; i < text.length; i++) {
            const char = text[i]
            if (char === ',') {
                parts.push('')
            } else if (char === '\\') {
                const escaped = text[++i] ?? ''
                if (escaped === '' || !',|\\'.includes(escaped)) {
                    throw new Error(`Escape no válido: \\${escaped}`)
                }
                parts[parts.length - 1] += escaped
            } else {
                parts[parts.length - 1] += char
            }
        }
        return [...new Set(parts.map(Category.clean).filter(Boolean))]
    }

    /**
     * Escribe la lista de «Categorías:», separada por comas y con sus escapes.
     * @param categories Categorías.
     * @returns El texto tras «Categorías:».
     */
    static formatList(categories: string[]): string {
        return categories.map((category) => Table.escape(category).replace(/,/g, '\\,')).join(', ')
    }
}

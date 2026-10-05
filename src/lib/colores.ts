/** @file Color de cada categoría según su posición, y orden de la lista de categorías. */

const PALETA = ['--c1', '--c2', '--c3', '--c4', '--c5', '--c6', '--c7', '--c8', '--c9', '--c10']

/** Color de una categoría según su posición en la lista; gris si no está en ella. */
export function colorDe(tag: string, tags: string[]): string {
    const i = tags.indexOf(tag)
    return i < 0 ? 'var(--muted)' : `var(${PALETA[i % PALETA.length]})`
}

/** Categorías de la plantilla en su orden, seguidas de las demás por orden alfabético. */
export function ordenarTags(deSiempre: string[], usados: Iterable<string>): string[] {
    const otros = [...new Set(usados)].filter((t) => t && !deSiempre.includes(t)).sort((a, b) => a.localeCompare(b, 'es'))
    return [...deSiempre, ...otros]
}

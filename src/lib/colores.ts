/** @file Color de cada categoría según su posición, orden de la lista de categorías y segmentos de color para las barras. */

import { SIN_TAG } from './formato.ts'

/** Importe de una categoría con su color, para barras y rankings. */
export type Segmento = { etiqueta: string; valor: number; color: string }

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

/** Versión clara de un color, para el fondo de las categorías. */
export const suave = (color: string) => `color-mix(in srgb, ${color} 22%, white)`

/** Segmentos de un reparto por categoría, en el orden de `tags` y con «Sin categoría» al final. */
export const segmentos = (porTag: Map<string, number>, tags: string[]): Segmento[] =>
    [...tags, SIN_TAG]
        .filter((t) => porTag.has(t))
        .map((t) => ({ etiqueta: t, valor: porTag.get(t) ?? 0, color: colorDe(t, tags) }))

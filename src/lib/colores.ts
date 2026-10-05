/** @file Color de cada categoría según su posición, orden de la lista de categorías y segmentos de color para las barras. */

import { UNTAGGED } from './formato.ts'

/** Importe de una categoría con su color, para barras y rankings. */
export type Segment = { label: string; value: number; color: string }

const PALETTE = ['--c1', '--c2', '--c3', '--c4', '--c5', '--c6', '--c7', '--c8', '--c9', '--c10']

/** Color de una categoría según su posición en la lista; gris si no está en ella. */
export function tagColor(tag: string, tags: string[]): string {
    const i = tags.indexOf(tag)
    return i < 0 ? 'var(--muted)' : `var(${PALETTE[i % PALETTE.length]})`
}

/** Categorías de la plantilla en su orden, seguidas de las demás por orden alfabético. */
export function sortTags(templateTags: string[], usedTags: Iterable<string>): string[] {
    const others = [...new Set(usedTags)].filter((t) => t && !templateTags.includes(t)).sort((a, b) => a.localeCompare(b, 'es'))
    return [...templateTags, ...others]
}

/** Versión clara de un color, para el fondo de las categorías. */
export const softColor = (color: string) => `color-mix(in srgb, ${color} 22%, white)`

/** Segmentos de un reparto por categoría, en el orden de `tags` y con «Sin categoría» al final. */
export const tagSegments = (byTag: Map<string, number>, tags: string[]): Segment[] =>
    [...tags, UNTAGGED]
        .filter((t) => byTag.has(t))
        .map((t) => ({ label: t, value: byTag.get(t) ?? 0, color: tagColor(t, tags) }))

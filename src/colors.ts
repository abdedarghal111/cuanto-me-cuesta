/** @file Color de cada categoría según su posición y segmentos de color para las barras. */

import { Category } from './model/Category.ts'

/** Importe de una categoría con su color, para barras y rankings. */
export type Segment = { label: string; value: number; color: string }

const PALETTE = ['--c1', '--c2', '--c3', '--c4', '--c5', '--c6', '--c7', '--c8', '--c9', '--c10']

/** Color de una categoría según su posición en la lista; gris si no está en ella. */
export function tagColor(tag: string, tags: string[]): string {
    const i = tags.indexOf(tag)
    return i < 0 ? 'var(--muted)' : `var(${PALETTE[i % PALETTE.length]})`
}

/** Versión clara de un color, para el fondo de las categorías. */
export const softColor = (color: string) => `color-mix(in srgb, ${color} 22%, white)`

/** Segmentos de un reparto por categoría, en el orden de `tags` y con «Sin categoría» al final. */
export const tagSegments = (byTag: Map<string, number>, tags: string[]): Segment[] =>
    [...tags, Category.UNTAGGED]
        .filter((t) => byTag.has(t))
        .map((t) => ({ label: t, value: byTag.get(t) ?? 0, color: tagColor(t, tags) }))

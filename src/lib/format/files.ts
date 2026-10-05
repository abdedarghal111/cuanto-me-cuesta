/**
 * @file Nombre de los archivos de producto y fecha de hoy.
 */

import type { Product } from './model.ts'

/** Fecha de hoy como AAAA-MM-DD. */
export function today(): string {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** "Paralelas Tomás" + "2026-10-04" → "paralelas-tomas_2026-10-04.txt" */
export function fileName(product: Pick<Product, 'name' | 'date'>, suffix = ''): string {
    const base = `${product.name} ${suffix}`
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    return `${base || 'producto'}_${product.date}.txt`
}

/** Producto y fecha a partir del nombre de un archivo: "paralelas-tomas_2026-10-04.txt". */
export function parseFileName(name: string): { name?: string; date?: string } {
    const match = name.match(/^(.*?)(?:_(\d{4}-\d{2}-\d{2}))?\.txt$/)
    return { name: match?.[1], date: match?.[2] }
}

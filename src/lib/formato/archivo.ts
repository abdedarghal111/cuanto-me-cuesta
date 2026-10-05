/**
 * @file Nombre de los archivos de producto y fecha de hoy.
 */

import type { Documento } from './modelo.ts'

/** Fecha de hoy como AAAA-MM-DD. */
export function hoy(): string {
    const d = new Date()
    const dos = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`
}

/** "Paralelas Tomás" + "2026-10-04" → "paralelas-tomas_2026-10-04.txt" */
export function nombreDeArchivo(doc: Pick<Documento, 'producto' | 'fecha'>, extra = ''): string {
    const base = `${doc.producto} ${extra}`
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    return `${base || 'producto'}_${doc.fecha}.txt`
}

/** Producto y fecha a partir del nombre de un archivo: "paralelas-tomas_2026-10-04.txt". */
export function deNombreDeArchivo(nombre: string): { producto?: string; fecha?: string } {
    const m = nombre.match(/^(.*?)(?:_(\d{4}-\d{2}-\d{2}))?\.txt$/)
    return { producto: m?.[1], fecha: m?.[2] }
}

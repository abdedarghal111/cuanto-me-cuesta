/**
 * @file Plantillas de oficio de `src/res/plantillas/` (proceso principal): las da al asistente de hoja nueva, cuenta
 * lo que tendrá la hoja con lo marcado y crea esa hoja.
 */

import fs from 'node:fs'
import path from 'node:path'
import type { TemplatePreview, TemplateView } from '../ipc.ts'
import { CostSheet } from '../model/CostSheet.ts'
import { IdRegistry } from '../model/IdRegistry.ts'
import { Line } from '../model/Line.ts'
import type { LineItem } from '../model/LineItem.ts'
import type { Surcharge } from '../model/Surcharge.ts'
import { DocumentReader } from '../model/text/DocumentReader.ts'
import { handle } from './ipc.server.ts'

/** Carpeta de plantillas: una hoja normal por oficio. */
const FOLDER = path.resolve(import.meta.dirname, '../res/plantillas')

/** Las plantillas, leídas al arrancar, y las hojas que salen de ellas. */
export class TemplateController {
    /** Plantillas, por orden de nombre de archivo. */
    readonly #templates: CostSheet[]
    /** Identificadores de sus filas, para que la ventana diga cuáles marca. */
    readonly #ids = new IdRegistry('plantilla')
    readonly #views: TemplateView[]

    constructor() {
        this.#templates = fs
            .readdirSync(FOLDER)
            .filter((file) => file.endsWith('.txt'))
            .sort()
            .map((file) => DocumentReader.read(fs.readFileSync(path.join(FOLDER, file), 'utf8')))
        this.#views = this.#templates.map((template) => ({
            name: template.name,
            description: template.description,
            groups: TemplateController.#groups(template).map(({ title, recipe, items }) => ({
                title,
                recipe,
                items: items.map((item) => ({ id: this.#ids.id(item), name: item.name, detail: TemplateController.#detail(item), counts: item.counts })),
            })),
        }))
    }

    /** Categorías de las plantillas, en su orden y sin repetir: las que fijan el color de cada una. */
    get categories(): string[] {
        return [...new Set(this.#templates.flatMap((template) => template.categories))]
    }

    /** Registra las órdenes de las plantillas. */
    register(): void {
        handle('templates', () => this.#views)
        handle('previewTemplate', (index, picked) => this.#preview(index, picked))
    }

    /**
     * Crea una hoja con lo marcado de una plantilla.
     * @param index Posición de la plantilla.
     * @param picked Identificadores de las filas marcadas.
     * @param name Nombre de la hoja.
     * @param date Fecha de la hoja.
     * @returns La hoja.
     */
    build(index: number, picked: string[], name: string, date: string): CostSheet {
        const marked = new Set(picked)
        return CostSheet.fromTemplate(this.#templates[index], name, date, (item) => marked.has(this.#ids.id(item)))
    }

    /** Lo que tendrá la hoja que sale de una plantilla con lo marcado. */
    #preview(index: number, picked: string[]): TemplatePreview {
        const sheet = this.build(index, picked, '', '')
        return {
            groups: sheet.groups.length,
            recipes: sheet.functions.length,
            lines: sheet.sections.flatMap((section) => section.lines).length,
            categories: sheet.categories,
        }
    }

    /** Grupos de filas de una plantilla, en su orden: sus secciones y recetas y sus recargos sobre el total. */
    static #groups(sheet: CostSheet): { title: string; recipe: boolean; items: LineItem[] }[] {
        return [
            ...sheet.sections.map((section) => ({ title: section.title, recipe: section.isFunction, items: [...section.lines, ...section.surcharges] })),
            { title: 'Sobre el total', recipe: false, items: sheet.totalSurcharges },
        ].filter((group) => group.items.length)
    }

    /** Lo que se lee al lado de una fila: «lote · 19,99 € por 1000 g» o «recargo · 10 %». */
    static #detail(item: LineItem): string {
        if (item instanceof Line) {
            const [, , type, price] = item.serialize()
            return `${type} · ${price}`
        }
        return `recargo · ${(item as Surcharge).percent} %`
    }
}

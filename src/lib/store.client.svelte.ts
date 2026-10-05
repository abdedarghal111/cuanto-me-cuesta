/**
 * @file Gestor de productos (navegador): lee los productos de `datos/` y la plantilla, lleva el producto
 * abierto y los cambios sin guardar, y los escribe en disco. Los componentes lo importan como `store`.
 */

import * as api from './api.client.ts'
import { sortTags } from './colors.ts'
import {
    cleanTag, fileName, parseProduct, parseTemplate, productToText, summarize, today, usedTags, type Product, type Template,
} from './format.ts'

/** Copia profunda de un valor reactivo, sin vínculo con el original. */
export const clone = <T>(value: T): T => structuredClone($state.snapshot(value) as T)

/** Productos, plantilla, producto abierto y cambios sin guardar. */
class ProductStore {
    /** Productos cargados, por nombre de archivo. */
    products = $state<Record<string, Product>>({})
    files = $state<string[]>([])
    template = $state<Template>({ tags: [], defaultSectionTitles: [], sections: [], totalSurcharges: [] })
    /** Archivo abierto; `''` es la vista «Todo». */
    selected = $state('')
    /** Si el producto abierto se muestra como texto del archivo. */
    textMode = $state(false)
    /** Último aviso para la barra de arriba. */
    status = $state('')
    /** Productos con cambios sin guardar; solo se escriben en disco al pulsar Guardar o Ctrl+S. */
    unsaved = $state<Record<string, true>>({})

    hasUnsaved = $derived(Object.keys(this.unsaved).length > 0)
    product = $derived(this.selected ? this.products[this.selected] : undefined)
    summary = $derived(this.product ? summarize(this.product) : undefined)
    /** Todas las categorías, en el orden que fija su color. */
    tags = $derived(
        sortTags(this.template.tags, [
            ...Object.values(this.products).flatMap((p) => [...p.tags, ...usedTags(p.sections, p.totalSurcharges)]),
            ...usedTags(this.template.sections, this.template.totalSurcharges),
        ]),
    )

    /** Último texto leído o escrito de cada archivo, para detectar cambios hechos fuera de la app. */
    #lastText: Record<string, string> = {}
    /** Cola de escrituras, que se hacen de una en una. */
    #writeQueue: Promise<void> = Promise.resolve()

    /** Marca como sin guardar el producto abierto. */
    markChanged() {
        if (this.selected) {
            this.unsaved[this.selected] = true
        }
    }

    /** Abre un producto, o la vista «Todo» con `''`. */
    select(name: string) {
        this.textMode = false
        this.selected = name
    }

    /** Nombre de archivo libre para el producto; `current` es el que ya tiene, si lo tiene. */
    #freeFileName(product: Product, current = ''): string {
        let name = fileName(product)
        for (let i = 2; name !== current && this.files.includes(name); i++) {
            name = fileName(product, String(i))
        }
        return name
    }

    /** Guarda un producto. Si ha cambiado el nombre o la fecha, el archivo cambia de nombre. */
    save(name: string): Promise<void> {
        const product = this.products[name]
        if (!product) {
            return this.#writeQueue
        }
        const newName = this.#freeFileName(product, name)
        if (newName !== name) {
            this.products[newName] = product
            delete this.products[name]
            this.files = this.files.map((f) => (f === name ? newName : f)).sort()
            if (this.selected === name) {
                this.selected = newName
            }
        }
        delete this.unsaved[name]
        const text = productToText($state.snapshot(product))
        this.#writeQueue = this.#writeQueue.then(async () => {
            try {
                await api.writeFile(newName, text, name)
                if (name !== newName) {
                    delete this.#lastText[name]
                }
                this.#lastText[newName] = text
                this.status = `Guardado en datos/${newName}`
            } catch (e) {
                this.unsaved[newName] = true
                this.status = `No se pudo guardar: ${e}`
            }
        })
        return this.#writeQueue
    }

    /** Guarda todos los productos con cambios sin guardar. */
    saveAll(): Promise<void> {
        for (const name of Object.keys(this.unsaved)) {
            this.save(name)
        }
        return this.#writeQueue
    }

    /** Relee los archivos de disco sin sobrescribir los productos con cambios sin guardar. */
    async reload() {
        await this.#writeQueue
        try {
            const diskFiles = await api.listFiles()
            for (const name of diskFiles) {
                if (this.unsaved[name]) {
                    continue
                }
                const text = await api.readFile(name)
                if (text !== this.#lastText[name]) {
                    this.products[name] = parseProduct(text, name)
                    this.#lastText[name] = text
                }
            }
            // Se conservan los productos nuevos sin guardar, que aún no están en disco.
            for (const name of Object.keys(this.products)) {
                if (!diskFiles.includes(name) && !this.unsaved[name]) {
                    delete this.products[name]
                }
            }
            this.files = [...new Set([...diskFiles, ...Object.keys(this.unsaved)])].sort()
            if (this.selected && !this.files.includes(this.selected)) {
                this.selected = ''
            }
            this.template = parseTemplate(await api.readTemplate())
        } catch (e) {
            this.status = `No se pudieron leer los archivos: ${e}`
        }
    }

    /** Crea un producto sin guardar, en blanco o copia de `source`, y lo abre. */
    create(name: string, source?: Product) {
        const template = this.template
        const product: Product = source
            ? { ...clone(source), name, date: today() }
            : {
                name,
                date: today(),
                description: '',
                tags: [...template.tags],
                // Empieza con los bloques de «Por defecto:» de la plantilla.
                sections: template.sections.filter((s) => template.defaultSectionTitles.includes(s.title)).map(clone),
                totalSurcharges: clone(template.totalSurcharges),
            }
        const newName = this.#freeFileName(product)
        this.products[newName] = product
        this.files = [...this.files, newName].sort()
        this.unsaved[newName] = true
        this.select(newName)
    }

    /** Descarta los cambios sin guardar del producto abierto y vuelve a leer su archivo. */
    async discard() {
        delete this.unsaved[this.selected]
        delete this.#lastText[this.selected]
        this.textMode = false
        await this.reload()
    }

    /** Borra el producto abierto: su archivo se queda como `.txt.borrado`. */
    async delete() {
        const name = this.selected
        await this.#writeQueue
        // Un producto que nunca se ha guardado no tiene archivo.
        if (name in this.#lastText) {
            await api.deleteFile(name)
        }
        delete this.products[name]
        delete this.unsaved[name]
        delete this.#lastText[name]
        this.files = this.files.filter((f) => f !== name)
        this.selected = ''
        this.status = `Borrado «${name}»`
    }

    /** Sustituye el producto abierto por el que se lee de `text`, como cambio sin guardar. */
    loadText(text: string) {
        this.products[this.selected] = parseProduct(text, this.selected)
        this.textMode = false
        this.markChanged()
    }

    /** Añade la categoría a las del producto abierto si aún no está. */
    ensureTag(tag: string) {
        const t = cleanTag(tag)
        if (this.product && t && !this.product.tags.includes(t)) {
            this.product.tags.push(t)
        }
    }
}

export const store = new ProductStore()

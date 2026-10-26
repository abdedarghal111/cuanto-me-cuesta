/**
 * @file Gestor de hojas (navegador): lee las hojas de `datos/` y las plantillas, lleva la hoja abierta (y su URL)
 * y los cambios sin guardar, y las escribe en disco. Los componentes lo importan como `store`.
 */

import { createSubscriber } from 'svelte/reactivity'
import { Category } from './model/Category.ts'
import { CostSheet } from './model/CostSheet.ts'
import { DocumentReader } from './model/text/DocumentReader.ts'
import * as api from './routes/product/product.client.ts'

/** Objeto del modelo envuelto para Svelte → el objeto original. */
const originals = new WeakMap<object, object>()
/** Objeto del modelo → su envoltorio, para que cada objeto tenga siempre el mismo. */
const wrappers = new WeakMap<object, object>()

/**
 * Da el objeto original de un envoltorio; los arrays, con sus elementos originales.
 * @param value Valor, envuelto o no.
 * @returns El valor sin envoltorio.
 */
function unwrap<T>(value: T): T {
    if (Array.isArray(value)) {
        return value.map(unwrap) as T
    }
    return (value && typeof value === 'object' ? (originals.get(value) ?? value) : value) as T
}

/**
 * Envuelve un objeto de una hoja para que Svelte lo siga: cada lectura llama a `track` (el `createSubscriber` de su
 * hoja), y lo que devuelve también va envuelto. Los métodos y setters trabajan sobre el objeto original.
 * @param target Objeto del modelo (la hoja, una sección, una línea, un array…).
 * @param track Función que suscribe a quien lee a los avisos de la hoja.
 * @returns El envoltorio.
 */
function reactive<T extends object>(target: T, track: () => void): T {
    const known = wrappers.get(target)
    if (known) {
        return known as T
    }
    const wrap = (value: unknown) => (value && typeof value === 'object' ? reactive(value, track) : value)
    const wrapper = new Proxy(target, {
        get(t, key) {
            track()
            const value = Reflect.get(t, key, t)
            if (typeof value === 'function') {
                return (...args: unknown[]) => wrap(value.apply(t, args.map(unwrap)))
            }
            return wrap(value)
        },
        set(t, key, value) {
            return Reflect.set(t, key, unwrap(value), t)
        },
    })
    wrappers.set(target, wrapper)
    originals.set(wrapper, target)
    return wrapper
}

/** URL de cada vista: `/` es «Todo» y `/product/<archivo sin .txt>` es una hoja. */
const urlOf = (file: string) => (file ? `/product/${encodeURIComponent(file.replace(/\.txt$/, ''))}` : '/')

/**
 * Archivo que abre una URL.
 * @param pathname Ruta de la URL.
 * @returns El archivo, o `''` para «Todo».
 */
function fileOfUrl(pathname: string): string {
    const match = pathname.match(/^\/product\/([^/]+)$/)
    return match ? `${decodeURIComponent(match[1])}.txt` : ''
}

/**
 * Fecha de hoy.
 * @returns La fecha como AAAA-MM-DD.
 */
export function today(): string {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Hojas, plantillas, hoja abierta y cambios sin guardar. */
class ProductStore {
    /** Hojas cargadas, por nombre de archivo, envueltas para que Svelte siga sus cambios. */
    products = $state<Record<string, CostSheet>>({})
    files = $state<string[]>([])
    /** Plantillas: hojas normales, una por oficio, de las que el asistente saca las hojas nuevas. Sin envolver. */
    templates = $state.raw<CostSheet[]>([])
    /** Archivo abierto; `''` es la vista «Todo». */
    selected = $state('')
    /** Si la hoja abierta se muestra como texto del archivo. */
    textMode = $state(false)
    /** Último aviso para la barra de arriba. */
    status = $state('')
    /** Hojas con cambios sin guardar; solo se escriben en disco al pulsar Guardar o Ctrl+S. */
    unsaved = $state<Record<string, true>>({})

    hasUnsaved = $derived(Object.keys(this.unsaved).length > 0)
    product = $derived(this.selected ? this.products[this.selected] : undefined)
    summary = $derived(this.product?.summarize())
    /** Todas las categorías, en el orden que fija su color. */
    tags = $derived(
        Category.sort(
            [...new Set(this.templates.flatMap((t) => t.categories))],
            Object.values(this.products).flatMap((p) => p.categories),
        ),
    )

    /** Último texto leído o escrito de cada archivo, para detectar cambios hechos fuera de la app. */
    #lastText: Record<string, string> = {}
    /** Cola de escrituras, que se hacen de una en una. */
    #writeQueue: Promise<void> = Promise.resolve()

    /** Abre una hoja, o la vista «Todo» con `''`, y la apunta en el historial del navegador. */
    select(name: string) {
        this.textMode = false
        this.#navigate(name)
    }

    /** Abre la vista de la URL actual (al cargar o al ir atrás y adelante); si la hoja no existe, «Todo». */
    openUrl() {
        const file = fileOfUrl(location.pathname)
        this.textMode = false
        this.#navigate(this.files.includes(file) ? file : '', true)
    }

    /** Cambia el archivo abierto y pone su URL; con `replace`, sin añadir una entrada al historial. */
    #navigate(name: string, replace = false) {
        this.selected = name
        const url = urlOf(name)
        if (location.pathname === url) {
            return
        }
        if (replace) {
            history.replaceState(null, '', url)
        } else {
            history.pushState(null, '', url)
        }
    }

    /**
     * Envuelve una hoja para Svelte y marca como sin guardar su archivo cada vez que avisa de un cambio.
     * @param sheet Hoja recién leída o creada.
     * @returns La hoja envuelta, que es la que se guarda en `products`.
     */
    #watch(sheet: CostSheet): CostSheet {
        const view = reactive(sheet, createSubscriber((update) => sheet.subscribe(update)))
        sheet.subscribe(() => {
            const name = Object.keys(this.products).find((file) => this.products[file] === view)
            if (name) {
                this.unsaved[name] = true
            }
        })
        return view
    }

    /** Nombre de archivo libre para la hoja; `current` es el que ya tiene, si lo tiene. */
    #freeFileName(sheet: CostSheet, current = ''): string {
        let name = sheet.fileName()
        for (let i = 2; name !== current && this.files.includes(name); i++) {
            name = sheet.fileName(String(i))
        }
        return name
    }

    /** Guarda una hoja. Si ha cambiado el nombre o la fecha, el archivo cambia de nombre. */
    save(name: string): Promise<void> {
        const sheet = this.products[name]
        if (!sheet) {
            return this.#writeQueue
        }
        const newName = this.#freeFileName(sheet, name)
        if (newName !== name) {
            this.products[newName] = sheet
            delete this.products[name]
            this.files = this.files.map((f) => (f === name ? newName : f)).sort()
            if (this.selected === name) {
                this.#navigate(newName, true)
            }
        }
        delete this.unsaved[name]
        const text = sheet.serialize().join('\n')
        this.#writeQueue = this.#writeQueue.then(async () => {
            try {
                await api.saveProduct(newName, text, name)
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

    /** Guarda todas las hojas con cambios sin guardar. */
    saveAll(): Promise<void> {
        for (const name of Object.keys(this.unsaved)) {
            this.save(name)
        }
        return this.#writeQueue
    }

    /**
     * Relee los archivos de disco sin sobrescribir las hojas con cambios sin guardar. Un archivo que no se puede
     * leer se queda sin cargar y su error va a `status`.
     */
    async reload() {
        await this.#writeQueue
        try {
            const diskFiles = await api.listProducts()
            const errors: string[] = []
            for (const name of diskFiles) {
                if (this.unsaved[name]) {
                    continue
                }
                const text = await api.readProduct(name)
                if (text === this.#lastText[name]) {
                    continue
                }
                try {
                    this.products[name] = this.#watch(DocumentReader.read(text))
                    this.#lastText[name] = text
                } catch (e) {
                    delete this.products[name]
                    errors.push(`datos/${name}: ${e}`)
                }
            }
            // Se conservan las hojas nuevas sin guardar, que aún no están en disco.
            for (const name of Object.keys(this.products)) {
                if (!diskFiles.includes(name) && !this.unsaved[name]) {
                    delete this.products[name]
                }
            }
            this.files = [...new Set([...diskFiles, ...Object.keys(this.unsaved)])].sort()
            if (this.selected && !this.files.includes(this.selected)) {
                this.#navigate('', true)
            }
            this.templates = (await api.readTemplates()).map((text) => DocumentReader.read(text))
            if (errors.length) {
                this.status = `No se pudo leer ${errors.join(' · ')}`
            }
        } catch (e) {
            this.status = `No se pudieron leer los archivos: ${e}`
        }
    }

    /** Crea una hoja sin guardar, en blanco o copia de `source`, con el nombre y la fecha dados, y la abre. */
    create(name: string, source?: CostSheet, date = today()) {
        this.add(CostSheet.copy(unwrap(source ?? new CostSheet()), name, date))
    }

    /** Añade una hoja nueva sin guardar (p. ej. la que sale del asistente) y la abre. */
    add(sheet: CostSheet) {
        const newName = this.#freeFileName(sheet)
        this.products[newName] = this.#watch(sheet)
        this.files = [...this.files, newName].sort()
        this.unsaved[newName] = true
        this.select(newName)
    }

    /** Descarta los cambios sin guardar de la hoja abierta y vuelve a leer su archivo. */
    async discard() {
        delete this.unsaved[this.selected]
        delete this.#lastText[this.selected]
        this.textMode = false
        await this.reload()
    }

    /** Borra la hoja abierta: su archivo se queda como `.txt.borrado`. */
    async delete() {
        const name = this.selected
        await this.#writeQueue
        // Una hoja que nunca se ha guardado no tiene archivo.
        if (name in this.#lastText) {
            await api.deleteProduct(name)
        }
        delete this.products[name]
        delete this.unsaved[name]
        delete this.#lastText[name]
        this.files = this.files.filter((f) => f !== name)
        this.#navigate('')
        this.status = `Borrado «${name}»`
    }

    /**
     * Sustituye la hoja abierta por la que se lee de `text`, como cambio sin guardar.
     * @param text Texto de la hoja.
     * @throws {ParseError} Si el texto no es una hoja válida; la hoja abierta no cambia.
     */
    loadText(text: string) {
        this.products[this.selected] = this.#watch(DocumentReader.read(text))
        this.unsaved[this.selected] = true
        this.textMode = false
    }
}

export const store = new ProductStore()

/**
 * @file Estado de la ventana: refleja lo que manda el proceso principal (las hojas abiertas, sus fotos, sus cuentas)
 * y lleva solo lo propio de la pantalla (la hoja que se ve, su URL y si se ve como texto). Los componentes lo importan
 * como `store` y mandan sus órdenes con `api` o con `store.edit()`.
 */

import { api } from './api.client.ts'
import type { AppState, DocumentInfo, Overview, TemplateView, UpdateInfo } from './ipc.ts'
import type { SheetEdit } from './model/SheetEdit.ts'
import type { SheetView } from './model/SheetView.ts'

/** URL de cada vista, en el hash: `#/` es «Todo» y `#/product/<hoja>` es una hoja. */
const urlOf = (id: string) => (id ? `#/product/${encodeURIComponent(id)}` : '#/')

/**
 * Hoja que abre una URL.
 * @param hash Hash de la URL.
 * @returns El identificador de la hoja, o `''` para «Todo».
 */
function idOfUrl(hash: string): string {
    const match = hash.match(/^#\/product\/([^/]+)$/)
    return match ? decodeURIComponent(match[1]) : ''
}

/**
 * Nombre de un archivo sin sus carpetas.
 * @param file Ruta del archivo.
 */
export const baseName = (file: string) => file.split(/[\\/]/).pop() ?? file

/**
 * Fecha de hoy.
 * @returns La fecha como AAAA-MM-DD.
 */
export function today(): string {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Lo que muestra la ventana. */
class Store {
    /** Hojas abiertas, tal como las manda el proceso principal. */
    documents = $state.raw<DocumentInfo[]>([])
    /** Foto de cada hoja, por identificador. */
    views = $state.raw<Record<string, SheetView>>({})
    /** Cuentas de todas las hojas juntas. */
    overview = $state.raw<Overview>({ cost: 0, total: 0, byCategory: [] })
    /** Todas las categorías, en el orden que fija su color. */
    tags = $state.raw<string[]>([])
    templates = $state.raw<TemplateView[]>([])
    /** Versión nueva publicada, si la hay. */
    update = $state.raw<UpdateInfo | null>(null)
    /** Último aviso para la barra de arriba. */
    status = $state('')
    /** Hoja que se ve; `''` es la vista «Todo». */
    selected = $state('')
    /** Si la hoja que se ve se muestra como texto de su archivo. */
    textMode = $state(false)

    document = $derived(this.documents.find((d) => d.id === this.selected))
    view = $derived(this.selected ? this.views[this.selected] : undefined)
    hasUnsaved = $derived(this.documents.some((d) => d.dirty))

    /** Arranque: escucha los avisos del proceso principal, pide el estado y abre la vista de la URL. */
    async start() {
        api.on('state', (state) => this.#apply(state))
        api.on('view', ({ id, view }) => (this.views = { ...this.views, [id]: view }))
        api.on('status', (status) => (this.status = status))
        api.on('select', (id) => this.select(id))
        const { views, ...state } = await api.state()
        this.views = views
        this.#apply(state)
        this.openUrl()
        this.templates = await api.templates()
        this.update = await api.checkUpdate()
    }

    /**
     * Aplica una edición a la hoja que se ve.
     * @param edit Orden de edición.
     * @returns El identificador de lo que crea, o `null`.
     */
    async edit(edit: SheetEdit): Promise<string | null> {
        try {
            return await api.edit(this.selected, edit)
        } catch (e) {
            this.status = `No se pudo cambiar: ${e}`
            return null
        }
    }

    /** Muestra una hoja, o la vista «Todo» con `''`, y la apunta en el historial. */
    select(id: string) {
        this.textMode = false
        this.#navigate(id)
    }

    /** Abre la vista de la URL actual (al cargar o al ir atrás y adelante); si la hoja no está abierta, «Todo». */
    openUrl() {
        const id = idOfUrl(location.hash)
        this.textMode = false
        this.#navigate(this.documents.some((d) => d.id === id) ? id : '', true)
    }

    /**
     * Toma el estado que manda el proceso principal; si la hoja que se ve se ha cerrado, vuelve a «Todo».
     * @param state Estado de la app.
     */
    #apply(state: AppState) {
        this.documents = state.documents
        this.overview = state.overview
        this.tags = state.tags
        this.views = Object.fromEntries(Object.entries(this.views).filter(([id]) => state.documents.some((d) => d.id === id)))
        if (this.selected && !this.document) {
            this.#navigate('', true)
        }
    }

    /** Cambia la hoja que se ve y pone su URL; con `replace`, sin añadir una entrada al historial. */
    #navigate(id: string, replace = false) {
        this.selected = id
        const url = urlOf(id)
        if (location.hash === url) {
            return
        }
        if (replace) {
            history.replaceState(null, '', url)
        } else {
            history.pushState(null, '', url)
        }
    }
}

export const store = new Store()

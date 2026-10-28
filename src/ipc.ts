/**
 * @file Contrato entre la ventana y el proceso principal: las órdenes que manda la ventana (`Commands`), los avisos
 * que le manda el proceso principal (`Events`) y los datos que viajan en ellos. El proceso principal registra cada
 * orden con su nombre, y `preload.server.ts` las expone como `window.api`.
 */

import type { SheetEdit } from './model/SheetEdit.ts'
import type { SheetView } from './model/SheetView.ts'

/** Una hoja abierta, sin su contenido. */
export interface DocumentInfo {
    id: string
    /** Ruta de su archivo, o `null` si aún no se ha guardado. */
    path: string | null
    name: string
    /** Si tiene cambios sin guardar. */
    dirty: boolean
    /** Si han cambiado su archivo fuera de la app y espera a que se elija con qué quedarse. */
    outside: boolean
}

/** Cuentas de todas las hojas juntas, para la portada. */
export interface Overview {
    cost: number
    total: number
    byCategory: [string, number][]
}

/** Estado de la app: las hojas abiertas, las cuentas de todas y las categorías en su orden de color. */
export interface AppState {
    documents: DocumentInfo[]
    overview: Overview
    /** Todas las categorías, en el orden que fija su color. */
    tags: string[]
}

/** Estado de la app con la foto de cada hoja, el que se pide al cargar la ventana. */
export interface FullState extends AppState {
    views: Record<string, SheetView>
}

/** Fila de una plantilla que se puede marcar en el asistente. */
export interface TemplateItem {
    id: string
    name: string
    /** El tipo y el precio de una línea, o el % de un recargo («lote · 19,99 € por 1000 g»). */
    detail: string
    /** Si sale marcada: las más probables. */
    counts: boolean
}

/** Grupo de filas de una plantilla: una sección, una receta o «Sobre el total». */
export interface TemplateGroup {
    title: string
    recipe: boolean
    items: TemplateItem[]
}

/** Plantilla de oficio, para el asistente de hoja nueva. */
export interface TemplateView {
    name: string
    description: string
    groups: TemplateGroup[]
}

/** Lo que tendrá la hoja que sale de una plantilla con lo marcado. */
export interface TemplatePreview {
    groups: number
    recipes: number
    lines: number
    categories: string[]
}

/** Cómo empieza una hoja nueva. */
export type NewSheet = { name: string; date: string } & (
    | { from: 'blank' }
    | { from: 'copy'; documentId: string }
    | { from: 'template'; index: number; picked: string[] }
)

/** Versión nueva publicada y la página de su release. */
export interface UpdateInfo {
    version: string
    url: string
}

/** Órdenes de la ventana al proceso principal. */
export interface Commands {
    /** Estado completo, al cargar la ventana. */
    state(): Promise<FullState>
    templates(): Promise<TemplateView[]>
    /**
     * Aplica una edición a una hoja.
     * @returns El identificador de lo que crea, o `null`.
     */
    edit(documentId: string, edit: SheetEdit): Promise<string | null>
    /** Texto de la hoja tal como se guarda. */
    text(documentId: string): Promise<string>
    /** Sustituye la hoja por la que se lee del texto, como cambio sin guardar; falla si el texto no es válido. */
    loadText(documentId: string, text: string): Promise<void>
    /**
     * Crea una hoja nueva sin guardar.
     * @returns Su identificador.
     */
    create(sheet: NewSheet): Promise<string>
    previewTemplate(index: number, picked: string[]): Promise<TemplatePreview>
    /** Abre archivos (soltados en la ventana). */
    open(paths: string[]): Promise<void>
    /** Abre archivos elegidos en el diálogo de abrir. */
    openDialog(): Promise<void>
    save(documentId: string): Promise<void>
    saveAs(documentId: string): Promise<void>
    saveAll(): Promise<void>
    /** Vuelve a lo guardado; una hoja nueva se cierra. */
    discard(documentId: string): Promise<void>
    /** Cierra la hoja; si tiene cambios, antes pregunta si se guardan. */
    close(documentId: string): Promise<void>
    /** Trae a la hoja el cambio que le han hecho fuera. */
    acceptOutside(documentId: string): Promise<void>
    /** Devuelve el archivo a lo que tiene la hoja guardado, deshaciendo el cambio de fuera. */
    restoreFile(documentId: string): Promise<void>
    checkUpdate(): Promise<UpdateInfo | null>
    openRelease(url: string): Promise<void>
}

/** Nombres de las órdenes, los que registra el proceso principal y expone el puente. */
export const COMMANDS = [
    'state', 'templates', 'edit', 'text', 'loadText', 'create', 'previewTemplate', 'open', 'openDialog', 'save', 'saveAs',
    'saveAll', 'discard', 'close', 'acceptOutside', 'restoreFile', 'checkUpdate', 'openRelease',
] as const satisfies readonly (keyof Commands)[]

// Comprobación de tipos: `COMMANDS` nombra todas las órdenes de `Commands`.
true satisfies Exclude<keyof Commands, (typeof COMMANDS)[number]> extends never ? true : false

/** Avisos del proceso principal a la ventana. */
export interface Events {
    /** Ha cambiado el estado de la app. */
    state: AppState
    /** Ha cambiado una hoja. */
    view: { id: string; view: SheetView }
    /** Aviso para la barra de arriba. */
    status: string
    /** Hay que mostrar esta hoja (la última abierta). */
    select: string
}

/** Lo que expone el puente como `window.api`. */
export type Api = Commands & {
    /** Escucha un aviso del proceso principal. */
    on<K extends keyof Events>(event: K, listener: (data: Events[K]) => void): void
    /** Ruta en disco de un archivo soltado en la ventana. */
    pathOf(file: File): string
}

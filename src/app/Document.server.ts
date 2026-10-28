/**
 * @file Una hoja abierta (proceso principal): su `CostSheet`, su archivo, sus cambios sin guardar, su copia de
 * recuperación y la vigilancia de su archivo. Avisa de cada cambio a quien la gestiona.
 */

import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import type { DocumentInfo } from '../ipc.ts'
import { CostSheet } from '../model/CostSheet.ts'
import { IdRegistry } from '../model/IdRegistry.ts'
import { type SheetEdit, SheetEdits } from '../model/SheetEdit.ts'
import { type SheetView, SheetViews } from '../model/SheetView.ts'
import { DocumentReader } from '../model/text/DocumentReader.ts'
import { writeSafely } from './disk.server.ts'

/** Quien gestiona las hojas, al que cada hoja avisa cuando cambia. */
export interface DocumentHost {
    /**
     * La hoja ha cambiado: su contenido o su estado.
     * @param document Hoja.
     */
    changed(document: Document): void
}

/** Copia de recuperación que quedó de una sesión anterior. */
export interface Leftover {
    /** Archivo de la copia. */
    file: string
    /** Hoja a la que pertenece, o `null` si era nueva. */
    path: string | null
    text: string
}

/** Extensión de las hojas de la app. */
export const EXTENSION = '.cmctxt'

/** Retraso de la copia de recuperación tras el último cambio. */
const BACKUP_DELAY = 1000

/** Hoja abierta: el contenido es su `CostSheet`, y el archivo, el texto que tiene en disco. */
export class Document {
    static #next = 1

    readonly id = `doc${Document.#next++}`
    readonly #host: DocumentHost
    /** Identificadores de los objetos de la hoja, los que usa la ventana. */
    readonly #ids = new IdRegistry(this.id)
    #sheet: CostSheet
    /** Ruta del archivo, o `null` si nunca se ha guardado. */
    #path: string | null
    /** Lo último que se leyó del archivo o se escribió en él. */
    #diskText: string | null
    #dirty = false
    /** Lo que han dejado fuera de la app en el archivo, mientras no se elige con qué quedarse. */
    #outsideText: string | null = null
    /** Archivo de su copia de recuperación. */
    #recoveryFile: string
    #backupTimer: ReturnType<typeof setTimeout> | undefined

    /**
     * Crea la hoja abierta.
     * @param host Quien la gestiona.
     * @param sheet Contenido.
     * @param file Su archivo y lo que tiene, o `null` si es nueva.
     * @param recoveryFile Copia de recuperación que reutiliza (la de una hoja nueva recuperada).
     */
    constructor(host: DocumentHost, sheet: CostSheet, file: { path: string; text: string } | null, recoveryFile?: string) {
        this.#host = host
        this.#sheet = sheet
        this.#path = file?.path ?? null
        this.#diskText = file?.text ?? null
        this.#recoveryFile = recoveryFile ?? Document.#recoveryFileOf(this.#path, this.id)
        this.#watch()
    }

    /**
     * Abre una hoja de su archivo.
     * @param host Quien la gestiona.
     * @param file Ruta del archivo.
     * @returns La hoja.
     * @throws {ParseError} Si el archivo no es una hoja válida.
     */
    static open(host: DocumentHost, file: string): Document {
        const text = fs.readFileSync(file, 'utf8')
        return new Document(host, DocumentReader.read(text), { path: file, text })
    }

    /**
     * Copias de recuperación que quedan de una sesión que se cerró mal.
     * @param files Rutas de las hojas que se miran.
     * @param includeNew Si se miran también las de las hojas nuevas que nunca se guardaron.
     * @returns Las copias.
     */
    static leftovers(files: string[], includeNew: boolean): Leftover[] {
        const found: Leftover[] = files
            .map((file) => ({ file: Document.#recoveryFileOf(file, ''), path: file }))
            .filter(({ file }) => fs.existsSync(file))
            .map(({ file, path }) => ({ file, path, text: fs.readFileSync(file, 'utf8') }))
        const folder = Document.#newRecoveryFolder()
        if (includeNew && fs.existsSync(folder)) {
            for (const name of fs.readdirSync(folder)) {
                const file = path.join(folder, name)
                found.push({ file, path: null, text: fs.readFileSync(file, 'utf8') })
            }
        }
        return found
    }

    /** Ruta del archivo, o `null` si nunca se ha guardado. */
    get path(): string | null {
        return this.#path
    }

    /** Si tiene cambios sin guardar. */
    get dirty(): boolean {
        return this.#dirty
    }

    /** Contenido. */
    get sheet(): CostSheet {
        return this.#sheet
    }

    /** Lo que se ve de la hoja en la lista. */
    get info(): DocumentInfo {
        return { id: this.id, path: this.#path, name: this.#sheet.name, dirty: this.#dirty, outside: this.#outsideText !== null }
    }

    /** Foto del contenido para la ventana. */
    get view(): SheetView {
        return SheetViews.build(this.#sheet, this.#ids)
    }

    /**
     * Texto de la hoja tal como se guarda.
     * @returns El texto.
     */
    text(): string {
        return this.#sheet.serialize().join('\n')
    }

    /**
     * Aplica una edición de la ventana.
     * @param edit Orden de edición.
     * @returns El identificador de lo que crea, o `null`.
     */
    edit(edit: SheetEdit): string | null {
        const created = SheetEdits.apply(this.#sheet, this.#ids, edit)
        const id = created && this.#ids.id(created)
        this.#edited()
        return id
    }

    /** Marca la hoja como cambio sin guardar (una hoja nueva, que aún no está en ningún archivo). */
    markUnsaved(): void {
        this.#edited()
    }

    /**
     * Sustituye el contenido por el que se lee de un texto, como cambio sin guardar.
     * @param text Texto de una hoja.
     * @throws {ParseError} Si no es una hoja válida; el contenido no cambia.
     */
    loadText(text: string): void {
        this.#sheet = DocumentReader.read(text)
        this.#edited()
    }

    /**
     * Recupera los cambios de una copia de recuperación, como cambios sin guardar.
     * @param text Texto de la copia.
     * @throws {ParseError} Si no es una hoja válida.
     */
    recover(text: string): void {
        this.loadText(text)
    }

    /**
     * Guarda la hoja en su archivo o, con `file`, en otro, que pasa a ser el suyo.
     * @param file Ruta del archivo nuevo.
     * @throws {Error} Si no tiene archivo y no se da uno.
     */
    save(file = this.#path): void {
        if (!file) {
            throw new Error('La hoja aún no tiene archivo.')
        }
        const text = this.text()
        // Se apunta antes de escribir, para que la vigilancia no lo tome por un cambio de fuera.
        this.#diskText = text
        writeSafely(file, text)
        this.#clearBackup()
        if (file !== this.#path) {
            this.#unwatch()
            this.#path = file
            this.#recoveryFile = Document.#recoveryFileOf(file, this.id)
            this.#watch()
        }
        this.#dirty = false
        this.#outsideText = null
        this.#host.changed(this)
    }

    /**
     * Vuelve a lo que hay en el archivo y olvida los cambios sin guardar.
     * @returns `false` si es una hoja nueva, sin archivo al que volver.
     */
    discard(): boolean {
        if (!this.#path) {
            return false
        }
        const text = fs.readFileSync(this.#path, 'utf8')
        this.#sheet = DocumentReader.read(text)
        this.#diskText = text
        this.#dirty = false
        this.#outsideText = null
        this.#clearBackup()
        this.#host.changed(this)
        return true
    }

    /** Trae a la hoja lo que han dejado en el archivo fuera de la app; los cambios sin guardar se pierden. */
    acceptOutside(): void {
        if (this.#outsideText === null) {
            return
        }
        this.#sheet = DocumentReader.read(this.#outsideText)
        this.#diskText = this.#outsideText
        this.#outsideText = null
        this.#dirty = false
        this.#clearBackup()
        this.#host.changed(this)
    }

    /** Devuelve el archivo a lo último que la hoja leyó o guardó, deshaciendo el cambio de fuera. */
    restoreFile(): void {
        if (!this.#path || this.#diskText === null) {
            return
        }
        writeSafely(this.#path, this.#diskText)
        this.#outsideText = null
        this.#host.changed(this)
    }

    /** Deja de vigilar el archivo y borra la copia de recuperación: la hoja se cierra. */
    close(): void {
        this.#unwatch()
        this.#clearBackup()
    }

    /** Marca un cambio sin guardar, programa la copia de recuperación y avisa. */
    #edited(): void {
        this.#dirty = true
        clearTimeout(this.#backupTimer)
        this.#backupTimer = setTimeout(() => this.#backup(), BACKUP_DELAY)
        this.#host.changed(this)
    }

    /** Escribe la copia de recuperación, si sigue habiendo cambios sin guardar. */
    #backup(): void {
        if (!this.#dirty) {
            return
        }
        try {
            writeSafely(this.#recoveryFile, this.text())
        } catch {
            // Sin permiso en esa carpeta: la hoja sigue sin copia.
        }
    }

    /** Anula la copia programada y borra la que haya. */
    #clearBackup(): void {
        clearTimeout(this.#backupTimer)
        fs.rmSync(this.#recoveryFile, { force: true })
    }

    /** Vigila el archivo: cada segundo mira su fecha, que sigue valiendo aunque un editor lo reemplace por otro. */
    #watch(): void {
        if (this.#path) {
            fs.watchFile(this.#path, { interval: 1000 }, (current, previous) => {
                if (current.mtimeMs !== previous.mtimeMs) {
                    this.#diskChanged()
                }
            })
        }
    }

    #unwatch(): void {
        if (this.#path) {
            fs.unwatchFile(this.#path)
        }
    }

    /** El archivo ha cambiado en el disco: si no es lo que la hoja leyó o guardó, lo apunta y avisa. */
    #diskChanged(): void {
        let text: string
        try {
            text = fs.readFileSync(this.#path!, 'utf8')
        } catch {
            // Borrado o a medio escribir: se espera al siguiente cambio.
            return
        }
        const outside = text === this.#diskText ? null : text
        if (outside !== this.#outsideText) {
            this.#outsideText = outside
            this.#host.changed(this)
        }
    }

    /** Carpeta de las copias de recuperación de las hojas nuevas. */
    static #newRecoveryFolder(): string {
        return path.join(app.getPath('userData'), 'recuperacion')
    }

    /**
     * Copia de recuperación de una hoja: oculta junto a su archivo (`.~nombre.cmctxt#`, como LibreOffice) o, si es
     * nueva, en la carpeta de recuperación de la app.
     * @param file Ruta de su archivo, o `null` si es nueva.
     * @param id Identificador de la hoja, para el nombre de la copia de una hoja nueva.
     * @returns La ruta de la copia.
     */
    static #recoveryFileOf(file: string | null, id: string): string {
        if (file) {
            return path.join(path.dirname(file), `.~${path.basename(file)}#`)
        }
        return path.join(Document.#newRecoveryFolder(), `${Date.now()}-${id}.cmctxt`)
    }
}

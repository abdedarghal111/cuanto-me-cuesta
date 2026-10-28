/**
 * @file Las hojas abiertas (proceso principal): abrirlas, crearlas, guardarlas, cerrarlas y recuperar lo que quedó
 * sin guardar, y avisar a la ventana de cada cambio con su foto y el estado de la app.
 */

import { dialog } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import type { AppState, FullState, NewSheet } from '../ipc.ts'
import { Category } from '../model/Category.ts'
import { CostSheet } from '../model/CostSheet.ts'
import { Summary } from '../model/Summary.ts'
import { DocumentReader } from '../model/text/DocumentReader.ts'
import { Document, type DocumentHost, EXTENSION, type Leftover } from './Document.server.ts'
import { handle, send } from './ipc.server.ts'
import type { RecentFiles } from './RecentFiles.server.ts'
import type { TemplateController } from './TemplateController.server.ts'
import type { WindowController } from './WindowController.server.ts'

/** Las hojas abiertas, en el orden en que se abrieron. */
export class DocumentController implements DocumentHost {
    #documents: Document[] = []
    readonly #recent: RecentFiles
    readonly #templates: TemplateController
    readonly #window: WindowController

    /**
     * Crea el controlador.
     * @param recent Hojas recientes y última carpeta.
     * @param templates Plantillas, para las hojas nuevas y el orden de las categorías.
     * @param window Ventana, para los diálogos.
     */
    constructor(recent: RecentFiles, templates: TemplateController, window: WindowController) {
        this.#recent = recent
        this.#templates = templates
        this.#window = window
    }

    /** Registra las órdenes de las hojas. */
    register(): void {
        handle('state', () => this.#fullState())
        handle('edit', (id, edit) => this.#get(id).edit(edit))
        handle('text', (id) => this.#get(id).text())
        handle('loadText', (id, text) => this.#get(id).loadText(text))
        handle('create', (sheet) => this.#create(sheet))
        handle('open', (paths) => this.open(paths))
        handle('openDialog', () => this.#openDialog())
        handle('save', async (id) => {
            await this.#save(this.#get(id))
        })
        handle('saveAs', async (id) => {
            await this.#saveAs(this.#get(id))
        })
        handle('saveAll', () => this.#saveAll())
        handle('discard', (id) => this.#discard(this.#get(id)))
        handle('close', (id) => this.#close(this.#get(id)))
        handle('acceptOutside', (id) => this.#get(id).acceptOutside())
        handle('restoreFile', (id) => this.#get(id).restoreFile())
    }

    /**
     * Arranque: abre las hojas recientes, ofrece recuperar lo que quedó sin guardar y abre las que se pasan a la app.
     * @param files Hojas con que se abre la app.
     */
    async start(files: string[]): Promise<void> {
        this.#add(this.#recent.list())
        await this.#recover(Document.leftovers(this.#paths(), true))
        await this.open(files)
    }

    /**
     * Abre hojas (del diálogo, soltadas en la ventana o pasadas a la app), ofrece recuperar lo que quedó de ellas y
     * muestra la última. Las que ya están abiertas solo se muestran.
     * @param files Rutas de las hojas.
     */
    async open(files: string[]): Promise<void> {
        const before = this.#paths()
        const opened = this.#add(files.map((file) => path.resolve(file)))
        if (!opened.length) {
            return
        }
        this.#recent.add(opened.map((document) => document.path!))
        await this.#recover(Document.leftovers(this.#paths().filter((file) => !before.includes(file)), false))
        send('select', opened[opened.length - 1].id)
    }

    /**
     * Cierre de la app: pregunta por cada hoja con cambios sin guardar.
     * @returns Si se puede cerrar: no, si se cancela o no se llega a guardar.
     */
    async confirmCloseAll(): Promise<boolean> {
        if (!(await this.#confirm(this.#documents.filter((document) => document.dirty)))) {
            return false
        }
        for (const document of this.#documents) {
            document.close()
        }
        return true
    }

    /** Una hoja ha cambiado: se manda su foto y el estado de la app. */
    changed(document: Document): void {
        if (this.#documents.includes(document)) {
            send('view', { id: document.id, view: document.view })
            send('state', this.#state())
        }
    }

    /**
     * Hoja abierta por su identificador.
     * @throws {Error} Si no hay ninguna.
     */
    #get(id: string): Document {
        const document = this.#documents.find((d) => d.id === id)
        if (!document) {
            throw new Error('Esa hoja ya no está abierta.')
        }
        return document
    }

    /** Rutas de las hojas abiertas que tienen archivo. */
    #paths(): string[] {
        return this.#documents.flatMap((document) => (document.path ? [document.path] : []))
    }

    /** Estado de la app: las hojas, sus cuentas juntas y el orden de las categorías. */
    #state(): AppState {
        const overview = Summary.combine(this.#documents.map((document) => document.sheet.summarize()))
        return {
            documents: this.#documents.map((document) => document.info),
            overview: { cost: overview.cost, total: overview.total, byCategory: [...overview.byCategory] },
            tags: Category.sort(this.#templates.categories, this.#documents.flatMap((document) => document.sheet.categories)),
        }
    }

    #fullState(): FullState {
        return { ...this.#state(), views: Object.fromEntries(this.#documents.map((document) => [document.id, document.view])) }
    }

    /**
     * Añade una hoja a las abiertas y avisa.
     * @param document Hoja.
     */
    #push(document: Document): void {
        this.#documents.push(document)
        this.changed(document)
    }

    /**
     * Abre hojas de sus archivos; los que no son una hoja válida se dicen en el aviso y no se abren.
     * @param files Rutas de las hojas.
     * @returns Las hojas, también las que ya estaban abiertas.
     */
    #add(files: string[]): Document[] {
        const errors: string[] = []
        const opened: Document[] = []
        for (const file of files) {
            let document = this.#documents.find((d) => d.path === file)
            if (!document) {
                try {
                    document = Document.open(this, file)
                    this.#push(document)
                } catch (e) {
                    errors.push(`${path.basename(file)}: ${e instanceof Error ? e.message : e}`)
                    continue
                }
            }
            opened.push(document)
        }
        if (errors.length) {
            send('status', `No se pudo abrir ${errors.join(' · ')}`)
        }
        return opened
    }

    /**
     * Ofrece recuperar las copias que quedaron de una sesión que se cerró mal: las hojas se quedan con esos cambios
     * sin guardar (las nuevas se vuelven a abrir), o se borran las copias.
     * @param leftovers Copias encontradas.
     */
    async #recover(leftovers: Leftover[]): Promise<void> {
        if (!leftovers.length) {
            return
        }
        const names = leftovers.map(({ path: file, text }) => {
            try {
                return DocumentReader.read(text).name
            } catch {
                return file ? path.basename(file) : 'Hoja nueva'
            }
        })
        const answer = await this.#window.ask(
            'La app se cerró sin guardar algunos cambios',
            `${names.map((name) => `• ${name}`).join('\n')}\n\nSi los recuperas, se abren como cambios sin guardar. Si los descartas, se pierden.`,
            ['Descartar', 'Recuperar'],
        )
        for (const leftover of leftovers) {
            if (answer === 0 || !this.#restore(leftover)) {
                fs.rmSync(leftover.file, { force: true })
            }
        }
    }

    /**
     * Recupera una copia: su hoja se queda con esos cambios sin guardar o, si era nueva, se vuelve a abrir.
     * @param leftover Copia de recuperación.
     * @returns Si se ha recuperado: no, si su hoja ya no está abierta o la copia no es una hoja válida.
     */
    #restore(leftover: Leftover): boolean {
        try {
            if (leftover.path) {
                const document = this.#documents.find((d) => d.path === leftover.path)
                document?.recover(leftover.text)
                return !!document
            }
            const document = new Document(this, DocumentReader.read(leftover.text), null, leftover.file)
            this.#documents.push(document)
            document.markUnsaved()
            return true
        } catch {
            return false
        }
    }

    /**
     * Crea una hoja nueva sin guardar: en blanco, copia de otra o con lo marcado de una plantilla.
     * @param sheet Cómo empieza.
     * @returns Su identificador.
     */
    #create(sheet: NewSheet): string {
        const content =
            sheet.from === 'template'
                ? this.#templates.build(sheet.index, sheet.picked, sheet.name, sheet.date)
                : CostSheet.copy(sheet.from === 'copy' ? this.#get(sheet.documentId).sheet : new CostSheet(), sheet.name, sheet.date)
        const document = new Document(this, content, null)
        this.#documents.push(document)
        document.markUnsaved()
        return document.id
    }

    /** Abre las hojas elegidas en el diálogo de abrir: las de la app y cualquier texto. */
    async #openDialog(): Promise<void> {
        const result = await dialog.showOpenDialog(this.#window.window!, {
            title: 'Abrir hojas',
            defaultPath: this.#recent.folder(),
            properties: ['openFile', 'multiSelections'],
            filters: [
                { name: 'Hojas de coste', extensions: [EXTENSION.slice(1), 'txt'] },
                { name: 'Todos los archivos', extensions: ['*'] },
            ],
        })
        await this.open(result.filePaths)
    }

    /**
     * Guarda una hoja encima de su archivo; si es nueva, pide dónde.
     * @returns Si se ha guardado.
     */
    async #save(document: Document): Promise<boolean> {
        if (!document.path) {
            return this.#saveAs(document)
        }
        return this.#write(document, document.path)
    }

    /**
     * Guarda una hoja donde se elija en el diálogo de guardar como; el archivo elegido pasa a ser el suyo.
     * @returns Si se ha guardado: no, si se cancela el diálogo o falla.
     */
    async #saveAs(document: Document): Promise<boolean> {
        const result = await dialog.showSaveDialog(this.#window.window!, {
            title: 'Guardar como',
            defaultPath: document.path ?? path.join(this.#recent.folder(), document.sheet.fileName()),
            filters: [{ name: 'Hojas de coste', extensions: [EXTENSION.slice(1)] }],
        })
        if (!result.filePath) {
            return false
        }
        const file = path.extname(result.filePath) ? result.filePath : result.filePath + EXTENSION
        // Si ese archivo estaba abierto en otra hoja, esa se cierra: el archivo pasa a ser de esta.
        const other = this.#documents.find((d) => d !== document && d.path === file)
        if (other) {
            this.#remove(other)
        }
        const previous = document.path
        const saved = this.#write(document, file)
        if (saved && previous && previous !== file) {
            this.#recent.remove(previous)
        }
        return saved
    }

    /**
     * Escribe una hoja en un archivo y lo apunta en los recientes.
     * @returns Si se ha escrito.
     */
    #write(document: Document, file: string): boolean {
        try {
            document.save(file)
            this.#recent.add([file])
            send('status', `Guardado en ${file}`)
            return true
        } catch (e) {
            send('status', `No se pudo guardar: ${e instanceof Error ? e.message : e}`)
            return false
        }
    }

    /** Guarda todas las hojas con cambios, una a una; se detiene si se cancela una. */
    async #saveAll(): Promise<void> {
        for (const document of this.#documents.filter((d) => d.dirty)) {
            if (!(await this.#save(document))) {
                return
            }
        }
    }

    /** Vuelve a lo guardado; una hoja nueva, que no tiene nada guardado, se cierra. */
    #discard(document: Document): void {
        if (!document.discard()) {
            this.#remove(document)
        }
    }

    /** Cierra una hoja sin tocar su archivo; si tiene cambios, antes pregunta si se guardan. */
    async #close(document: Document): Promise<void> {
        if (document.dirty && !(await this.#confirm([document]))) {
            return
        }
        this.#remove(document)
        if (document.path) {
            this.#recent.remove(document.path)
        }
        send('status', `Cerrada «${document.sheet.name}»; su archivo sigue en el disco`)
    }

    /** Quita una hoja de las abiertas: deja de vigilar su archivo y borra su copia de recuperación. */
    #remove(document: Document): void {
        document.close()
        this.#documents = this.#documents.filter((d) => d !== document)
        send('state', this.#state())
    }

    /**
     * Pregunta, hoja a hoja, si se guardan sus cambios: guardar, no guardar o cancelar.
     * @param documents Hojas con cambios sin guardar.
     * @returns Si se pueden cerrar: no, si se cancela o no se llega a guardar.
     */
    async #confirm(documents: Document[]): Promise<boolean> {
        for (const document of documents) {
            send('select', document.id)
            const name = document.sheet.name || path.basename(document.path ?? 'Hoja nueva')
            const answer = await this.#window.ask(`¿Guardo los cambios de «${name}»?`, 'Si no los guardas, se pierden.', ['Guardar', 'No guardar', 'Cancelar'])
            if (answer === 2 || (answer === 0 && !(await this.#save(document)))) {
                return false
            }
        }
        return true
    }
}

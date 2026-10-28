/**
 * @file Arranque de la app (proceso principal de Electron): crea los controladores de `app/`, registra sus órdenes y
 * abre la ventana con la página (desde el código, la del servidor de Vite; instalada, la compilada de `dist/`). Lleva
 * una sola instancia y los archivos con que se abre la app.
 */

import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { EXTENSION } from './app/Document.server.ts'
import { DocumentController } from './app/DocumentController.server.ts'
import { RecentFiles } from './app/RecentFiles.server.ts'
import { TemplateController } from './app/TemplateController.server.ts'
import { UpdateController } from './app/UpdateController.server.ts'
import { WindowController } from './app/WindowController.server.ts'

/** Carpeta del proyecto, donde están `vite.config.ts` e `index.html`. */
const ROOT = path.resolve(import.meta.dirname, '..')

app.setName('Cuánto me cuesta')
app.setPath('userData', path.join(app.getPath('appData'), 'cuanto-me-cuesta'))

/**
 * Hojas que llegan en la línea de órdenes (al abrir la app o con «Abrir con…»).
 * @param argv Argumentos del proceso.
 * @param folder Carpeta desde la que se resuelven las rutas relativas.
 * @returns Sus rutas absolutas.
 */
function sheetsIn(argv: string[], folder = process.cwd()): string[] {
    return argv
        .map((arg) => path.resolve(folder, arg))
        .filter((file) => (file.endsWith(EXTENSION) || file.endsWith('.txt')) && fs.existsSync(file))
}

/**
 * Dirección de la página: desde el código, la del servidor de Vite, que arranca aquí y recarga en caliente; instalada,
 * la página compilada de `dist/`, porque Vite no va en el instalador.
 * @returns La URL que carga la ventana.
 */
async function pageUrl(): Promise<string> {
    if (app.isPackaged) {
        return pathToFileURL(path.join(ROOT, 'dist', 'index.html')).href
    }
    const { createServer } = await import('vite')
    const server = await createServer({ root: ROOT, configFile: path.join(ROOT, 'vite.config.ts') })
    await server.listen()
    app.on('will-quit', () => server.close())
    return server.resolvedUrls!.local[0]
}

/** Hojas con que se abre la app, hasta que los controladores están listos. */
const startupFiles = sheetsIn(process.argv)
let documents: DocumentController | undefined

// En macOS, las hojas abiertas con doble clic o «Abrir con…» llegan con este evento, no en la línea de órdenes.
app.on('open-file', (e, file) => {
    e.preventDefault()
    if (documents) {
        documents.open([file])
    } else {
        startupFiles.push(file)
    }
})

// Una sola instancia: si se abre otra, le pasa sus hojas a esta y se cierra.
if (!app.requestSingleInstanceLock()) {
    app.quit()
} else {
    const window = new WindowController()
    app.on('second-instance', (_e, argv, folder) => {
        documents?.open(sheetsIn(argv, folder))
        window.focus()
    })
    app.on('window-all-closed', () => app.quit())
    app.whenReady().then(async () => {
        const url = await pageUrl()
        const templates = new TemplateController()
        documents = new DocumentController(new RecentFiles(), templates, window)
        documents.register()
        templates.register()
        new UpdateController().register()
        const controller = documents
        await window.open(url, () => controller.confirmCloseAll())
        await documents.start(startupFiles)
    })
}

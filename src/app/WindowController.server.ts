/**
 * @file La ventana de la app (proceso principal): la abre, hace las preguntas con diálogos nativos y lleva el cierre,
 * que antes pregunta por las hojas con cambios sin guardar.
 */

import { BrowserWindow, dialog } from 'electron'
import path from 'node:path'

/** La ventana de la app y sus diálogos. */
export class WindowController {
    #window: BrowserWindow | undefined
    /** Si la ventana ya puede cerrarse: se ha preguntado por las hojas con cambios. */
    #closing = false

    /** La ventana, si está abierta: el padre de los diálogos. */
    get window(): BrowserWindow | undefined {
        return this.#window
    }

    /**
     * Abre la ventana.
     * @param url Página que carga.
     * @param confirmClose Pregunta por las hojas con cambios sin guardar antes de cerrar; devuelve si se puede cerrar.
     */
    async open(url: string, confirmClose: () => Promise<boolean>): Promise<void> {
        const window = new BrowserWindow({
            width: 1400,
            height: 900,
            autoHideMenuBar: true,
            // Sin `sandbox` para que el preload pueda ser TypeScript, que Electron lee sin compilar.
            webPreferences: { preload: path.join(import.meta.dirname, '../preload.server.ts'), sandbox: false },
        })
        this.#window = window
        // Al cerrar se pregunta una sola vez, aunque se vuelva a pulsar mientras tanto.
        let asking = false
        window.on('close', (e) => {
            if (this.#closing) {
                return
            }
            e.preventDefault()
            if (asking) {
                return
            }
            asking = true
            confirmClose().then((canClose) => {
                asking = false
                if (canClose) {
                    this.#closing = true
                    window.close()
                }
            })
        })
        await window.loadURL(url)
    }

    /** Trae la ventana al frente (al abrir la app otra vez con un archivo). */
    focus(): void {
        if (this.#window?.isMinimized()) {
            this.#window.restore()
        }
        this.#window?.focus()
    }

    /**
     * Pregunta con un diálogo nativo. El último botón es la opción que no pierde nada, y es la que se elige con Intro
     * o al cerrarlo.
     * @param message Pregunta.
     * @param detail Explicación debajo.
     * @param buttons Botones, de izquierda a derecha.
     * @returns La posición del botón pulsado.
     */
    async ask(message: string, detail: string, buttons: string[]): Promise<number> {
        const options = { type: 'warning' as const, title: 'Cuánto me cuesta', message, detail, buttons, defaultId: buttons.length - 1, cancelId: buttons.length - 1 }
        const { response } = this.#window ? await dialog.showMessageBox(this.#window, options) : await dialog.showMessageBox(options)
        return response
    }
}

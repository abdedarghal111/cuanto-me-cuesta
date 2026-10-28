/**
 * @file Registro tipado de las órdenes de `Commands` y envío de los avisos de `Events` (proceso principal). Cada
 * controlador registra las suyas con `handle()`.
 */

import { BrowserWindow, ipcMain } from 'electron'
import type { Commands, Events } from '../ipc.ts'

/**
 * Atiende una orden de la ventana.
 * @param name Nombre de la orden.
 * @param handler Función que la atiende, con los mismos argumentos y resultado que en `Commands`.
 */
export function handle<K extends keyof Commands>(
    name: K,
    handler: (...args: Parameters<Commands[K]>) => ReturnType<Commands[K]> | Awaited<ReturnType<Commands[K]>>,
): void {
    ipcMain.handle(name, (_e, ...args) => handler(...(args as Parameters<Commands[K]>)))
}

/**
 * Manda un aviso a la ventana.
 * @param event Nombre del aviso.
 * @param data Lo que lleva.
 */
export function send<K extends keyof Events>(event: K, data: Events[K]): void {
    for (const window of BrowserWindow.getAllWindows()) {
        window.webContents.send(event, data)
    }
}

/**
 * @file Puente entre la ventana y el proceso principal: expone `window.api` con las órdenes de `Commands` (una por
 * nombre de `COMMANDS`), la escucha de los avisos de `Events` y la ruta de un archivo soltado. Electron lo carga antes
 * que la página.
 */

import { contextBridge, ipcRenderer, webUtils } from 'electron'
import { type Api, COMMANDS, type Commands } from './ipc.ts'

/** Cada orden llama a la del mismo nombre en el proceso principal. */
const commands = Object.fromEntries(COMMANDS.map((name) => [name, (...args: unknown[]) => ipcRenderer.invoke(name, ...args)])) as unknown as Commands

const api: Api = {
    ...commands,
    on: (event, listener) => {
        ipcRenderer.on(event, (_e, data) => listener(data))
    },
    pathOf: (file) => webUtils.getPathForFile(file),
}

contextBridge.exposeInMainWorld('api', api)

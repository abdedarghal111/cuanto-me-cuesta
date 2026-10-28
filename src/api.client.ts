/**
 * @file Acceso de la ventana al proceso principal: `window.api`, que expone `preload.server.ts` con la forma de `Api`.
 */

import type { Api } from './ipc.ts'

declare global {
    interface Window {
        api: Api
    }
}

export const api = window.api

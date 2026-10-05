/**
 * @file Configuración de Vite: Svelte, Tailwind y el servidor de la API de `src/lib/api.server.ts`.
 */

import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
import { servidor } from './src/lib/api.server.ts'

export default defineConfig({
    plugins: [svelte(), tailwindcss(), servidor()],
    server: {
        // Los cambios en `datos/` y en la plantilla no recargan la página: la app los relee al recuperar el foco.
        watch: { ignored: ['**/datos/**', '**/src/res/template.txt'] },
    },
})

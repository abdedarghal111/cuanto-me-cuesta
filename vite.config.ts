/**
 * @file Configuración de Vite: Svelte, Tailwind y el servidor de la API de `src/main.server.ts`.
 */

import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
import { apiServer } from './src/main.server.ts'

export default defineConfig({
    // Sin `svelte.config.js`: la configuración por defecto basta y así no se busca.
    plugins: [svelte({ configFile: false }), tailwindcss(), apiServer()],
    server: {
        // Los cambios en `datos/` y en la plantilla no recargan la página: la app los relee al recuperar el foco.
        watch: { ignored: ['**/datos/**', '**/src/res/template.txt'] },
    },
})

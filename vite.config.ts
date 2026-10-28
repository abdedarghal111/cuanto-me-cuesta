/**
 * @file Configuración de Vite: Svelte y Tailwind. Desde el código, el proceso principal de Electron
 * (`src/main.server.ts`) arranca el servidor con ella; para los instaladores, `vite build` deja la página en `dist/`.
 */

import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
    // Rutas relativas: la app instalada abre `dist/index.html` como archivo, no desde un servidor.
    base: './',
    // Sin `svelte.config.js`: la configuración por defecto basta y así no se busca.
    plugins: [svelte({ configFile: false }), tailwindcss()],
    server: {
        // Los cambios en `datos/`, en las plantillas y en el lado de Electron no recargan la página: la app relee los
        // archivos al recuperar el foco, y el proceso principal y el preload solo se cargan al abrir la app.
        watch: { ignored: ['**/datos/**', '**/src/res/plantillas/**', '**/*.server.ts'] },
    },
})

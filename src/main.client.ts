/**
 * @file Punto de entrada de la ventana: carga los estilos, monta la aplicación en `#app` y lleva la URL (atrás y
 * adelante), los atajos de teclado y las hojas que se sueltan en la ventana.
 */

import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import { api } from './api.client.ts'
import { openNewSheet } from './components/NewSheetWizard.svelte'
import { store } from './store.client.svelte.ts'

store.start()

// Atrás y adelante.
window.addEventListener('popstate', () => store.openUrl())

// Ctrl+S guarda todo, Ctrl+Mayús+S guarda como, Ctrl+O abre y Ctrl+N crea una hoja.
window.addEventListener('keydown', (e) => {
    if (!(e.ctrlKey || e.metaKey)) {
        return
    }
    const key = e.key.toLowerCase()
    if (key === 's' && e.shiftKey) {
        e.preventDefault()
        if (store.selected) {
            api.saveAs(store.selected)
        }
    } else if (key === 's') {
        e.preventDefault()
        api.saveAll()
    } else if (key === 'o') {
        e.preventDefault()
        api.openDialog()
    } else if (key === 'n') {
        e.preventDefault()
        openNewSheet()
    }
})

// Las hojas soltadas en la ventana se abren; sin esto, la ventana navegaría al archivo. Solo se atienden archivos,
// para no aceptar en cualquier sitio los datos de receta que se arrastran dentro de la app.
const carriesFiles = (e: DragEvent) => e.dataTransfer?.types.includes('Files') ?? false
window.addEventListener('dragover', (e) => {
    if (carriesFiles(e)) {
        e.preventDefault()
    }
})
window.addEventListener('drop', (e) => {
    if (!carriesFiles(e)) {
        return
    }
    e.preventDefault()
    const paths = [...(e.dataTransfer?.files ?? [])].map((file) => api.pathOf(file)).filter(Boolean)
    if (paths.length) {
        api.open(paths)
    }
})

export default mount(App, { target: document.getElementById('app')! })

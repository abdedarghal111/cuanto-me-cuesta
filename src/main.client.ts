/**
 * @file Punto de entrada (navegador): carga los estilos, monta la aplicación en `#app` y gestiona la URL
 * (atrás y adelante), el guardado con Ctrl+S, la relectura al volver a la ventana y el aviso al cerrar.
 */

import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import { store } from './store.client.svelte.ts'

// Al cargar se leen los archivos y se abre la vista de la URL.
store.reload().then(() => store.openUrl())

// Atrás y adelante del navegador.
window.addEventListener('popstate', () => store.openUrl())

// Al volver a la ventana se releen los archivos, por si se han editado a mano.
window.addEventListener('focus', () => store.reload())

window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        store.saveAll()
    }
})

// Aviso del navegador al cerrar o recargar con cambios sin guardar.
window.addEventListener('beforeunload', (e) => {
    if (store.hasUnsaved) {
        e.preventDefault()
        e.returnValue = ''
    }
})

export default mount(App, { target: document.getElementById('app')! })

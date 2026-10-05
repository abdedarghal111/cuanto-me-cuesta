/** @file Punto de entrada (navegador): carga los estilos y monta la aplicación en `#app`. */

import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'

export default mount(App, { target: document.getElementById('app')! })

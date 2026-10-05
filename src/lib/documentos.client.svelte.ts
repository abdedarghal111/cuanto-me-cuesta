/**
 * @file Gestor de documentos (navegador): lee los productos de `datos/` y la plantilla, lleva el producto
 * abierto y los cambios sin guardar, y los escribe en disco. Los componentes lo importan como `documentos`.
 */

import * as api from './api.client.ts'
import { ordenarTags } from './colores.ts'
import {
    aTexto, deTexto, hoy, limpiarTag, nombreDeArchivo, plantillaDeTexto, resumir, usados, type Documento, type Plantilla,
} from './formato.ts'

/** Copia profunda de un valor reactivo, sin vínculo con el original. */
export const copia = <T>(x: T): T => structuredClone($state.snapshot(x) as T)

/** Productos, plantilla, producto abierto y cambios sin guardar. */
class GestorDeDocumentos {
    /** Productos cargados, por nombre de archivo. */
    docs = $state<Record<string, Documento>>({})
    archivos = $state<string[]>([])
    plantilla = $state<Plantilla>({ tags: [], porDefecto: [], secciones: [], sobreTotal: [] })
    /** Archivo abierto; `''` es la vista «Todo». */
    sel = $state('')
    /** Si el producto abierto se muestra como texto del archivo. */
    modoTexto = $state(false)
    /** Último aviso para la barra de arriba. */
    estado = $state('')
    /** Productos con cambios sin guardar; solo se escriben en disco al pulsar Guardar o Ctrl+S. */
    sucios = $state<Record<string, true>>({})

    haySucios = $derived(Object.keys(this.sucios).length > 0)
    doc = $derived(this.sel ? this.docs[this.sel] : undefined)
    resumen = $derived(this.doc ? resumir(this.doc) : undefined)
    /** Todas las categorías, en el orden que fija su color. */
    tags = $derived(
        ordenarTags(this.plantilla.tags, [
            ...Object.values(this.docs).flatMap((d) => [...d.tags, ...usados(d.secciones, d.sobreTotal)]),
            ...usados(this.plantilla.secciones, this.plantilla.sobreTotal),
        ]),
    )

    /** Último texto leído o escrito de cada archivo, para detectar cambios hechos fuera de la app. */
    #ultimoTexto: Record<string, string> = {}
    /** Cola de escrituras, que se hacen de una en una. */
    #cola: Promise<void> = Promise.resolve()

    /** Marca como sin guardar el producto abierto. */
    cambiado() {
        if (this.sel) {
            this.sucios[this.sel] = true
        }
    }

    /** Abre un producto, o la vista «Todo» con `''`. */
    elegir(nombre: string) {
        this.modoTexto = false
        this.sel = nombre
    }

    /** Nombre de archivo libre para el producto; `actual` es el que ya tiene, si lo tiene. */
    #nombreLibre(d: Documento, actual = ''): string {
        let nombre = nombreDeArchivo(d)
        for (let i = 2; nombre !== actual && this.archivos.includes(nombre); i++) {
            nombre = nombreDeArchivo(d, String(i))
        }
        return nombre
    }

    /** Guarda un producto. Si ha cambiado el título o la fecha, el archivo cambia de nombre. */
    guardar(nombre: string): Promise<void> {
        const d = this.docs[nombre]
        if (!d) {
            return this.#cola
        }
        const nuevo = this.#nombreLibre(d, nombre)
        if (nuevo !== nombre) {
            this.docs[nuevo] = d
            delete this.docs[nombre]
            this.archivos = this.archivos.map((a) => (a === nombre ? nuevo : a)).sort()
            if (this.sel === nombre) {
                this.sel = nuevo
            }
        }
        delete this.sucios[nombre]
        const texto = aTexto($state.snapshot(d))
        this.#cola = this.#cola.then(async () => {
            try {
                await api.escribir(nuevo, texto, nombre)
                if (nombre !== nuevo) {
                    delete this.#ultimoTexto[nombre]
                }
                this.#ultimoTexto[nuevo] = texto
                this.estado = `Guardado en datos/${nuevo}`
            } catch (e) {
                this.sucios[nuevo] = true
                this.estado = `No se pudo guardar: ${e}`
            }
        })
        return this.#cola
    }

    /** Guarda todos los productos con cambios sin guardar. */
    guardarTodo(): Promise<void> {
        for (const nombre of Object.keys(this.sucios)) {
            this.guardar(nombre)
        }
        return this.#cola
    }

    /** Relee los archivos de disco sin sobrescribir los productos con cambios sin guardar. */
    async recargar() {
        await this.#cola
        try {
            const lista = await api.listar()
            for (const nombre of lista) {
                if (this.sucios[nombre]) {
                    continue
                }
                const texto = await api.leer(nombre)
                if (texto !== this.#ultimoTexto[nombre]) {
                    this.docs[nombre] = deTexto(texto, nombre)
                    this.#ultimoTexto[nombre] = texto
                }
            }
            // Se conservan los productos nuevos sin guardar, que aún no están en disco.
            for (const nombre of Object.keys(this.docs)) {
                if (!lista.includes(nombre) && !this.sucios[nombre]) {
                    delete this.docs[nombre]
                }
            }
            this.archivos = [...new Set([...lista, ...Object.keys(this.sucios)])].sort()
            if (this.sel && !this.archivos.includes(this.sel)) {
                this.sel = ''
            }
            this.plantilla = plantillaDeTexto(await api.leerPlantilla())
        } catch (e) {
            this.estado = `No se pudieron leer los archivos: ${e}`
        }
    }

    /** Crea un producto sin guardar, en blanco o copia de `base`, y lo abre. */
    crear(producto: string, base?: Documento) {
        const p = this.plantilla
        const d: Documento = base
            ? { ...copia(base), producto, fecha: hoy() }
            : {
                producto,
                fecha: hoy(),
                descripcion: '',
                tags: [...p.tags],
                // Empieza con los bloques de «Por defecto:» de la plantilla.
                secciones: p.secciones.filter((s) => p.porDefecto.includes(s.titulo)).map(copia),
                sobreTotal: copia(p.sobreTotal),
            }
        const nombre = this.#nombreLibre(d)
        this.docs[nombre] = d
        this.archivos = [...this.archivos, nombre].sort()
        this.sucios[nombre] = true
        this.elegir(nombre)
    }

    /** Descarta los cambios sin guardar del producto abierto y vuelve a leer su archivo. */
    async descartar() {
        delete this.sucios[this.sel]
        delete this.#ultimoTexto[this.sel]
        this.modoTexto = false
        await this.recargar()
    }

    /** Borra el producto abierto: su archivo se queda como `.txt.borrado`. */
    async borrar() {
        const nombre = this.sel
        await this.#cola
        // Un producto que nunca se ha guardado no tiene archivo.
        if (nombre in this.#ultimoTexto) {
            await api.borrar(nombre)
        }
        delete this.docs[nombre]
        delete this.sucios[nombre]
        delete this.#ultimoTexto[nombre]
        this.archivos = this.archivos.filter((a) => a !== nombre)
        this.sel = ''
        this.estado = `Borrado «${nombre}»`
    }

    /** Sustituye el producto abierto por el que se lee de `texto`, como cambio sin guardar. */
    cargarTexto(texto: string) {
        this.docs[this.sel] = deTexto(texto, this.sel)
        this.modoTexto = false
        this.cambiado()
    }

    /** Añade la categoría a las del producto abierto si aún no está. */
    asegurarTag(tag: string) {
        const t = limpiarTag(tag)
        if (this.doc && t && !this.doc.tags.includes(t)) {
            this.doc.tags.push(t)
        }
    }
}

export const documentos = new GestorDeDocumentos()

/**
 * @file Hojas recientes y última carpeta usada (proceso principal), guardadas en la carpeta de datos de la app para
 * recordarlas entre sesiones.
 */

import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { writeSafely } from './disk.server.ts'

/** Las hojas abiertas de una sesión a otra y la carpeta que proponen los diálogos. */
export class RecentFiles {
    /** Rutas de las hojas, en `archivos.json`. */
    readonly #listPath = path.join(app.getPath('userData'), 'archivos.json')
    /** Última carpeta usada, en `ultima-carpeta.txt`. */
    readonly #folderPath = path.join(app.getPath('userData'), 'ultima-carpeta.txt')

    /**
     * Las hojas recientes que aún existen; las demás se olvidan.
     * @returns Sus rutas, en el orden en que se abrieron.
     */
    list(): string[] {
        let files: string[] = []
        try {
            files = JSON.parse(fs.readFileSync(this.#listPath, 'utf8'))
        } catch {
            // Aún no hay ninguna.
        }
        const existing = files.filter((file) => fs.existsSync(file))
        this.#write(existing)
        return existing
    }

    /**
     * Apunta hojas abiertas o guardadas, y la carpeta de la última como la última usada.
     * @param files Rutas de las hojas.
     */
    add(files: string[]): void {
        this.#write([...this.list(), ...files])
        if (files.length) {
            writeSafely(this.#folderPath, path.dirname(files[files.length - 1]))
        }
    }

    /**
     * Olvida una hoja, sin tocar su archivo.
     * @param file Ruta de la hoja.
     */
    remove(file: string): void {
        this.#write(this.list().filter((f) => f !== file))
    }

    /**
     * Carpeta que proponen los diálogos: la del último archivo abierto o guardado, aunque fuera en otra sesión; si no
     * hay o ya no existe, la carpeta personal.
     * @returns La ruta de la carpeta.
     */
    folder(): string {
        try {
            const folder = fs.readFileSync(this.#folderPath, 'utf8').trim()
            if (fs.existsSync(folder)) {
                return folder
            }
        } catch {
            // Aún no se ha usado ninguna.
        }
        return app.getPath('home')
    }

    /** Escribe la lista, sin repetidos. */
    #write(files: string[]): void {
        writeSafely(this.#listPath, JSON.stringify([...new Set(files)], null, 4))
    }
}

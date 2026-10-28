/**
 * @file Aviso de versiones nuevas (proceso principal): compara la última release publicada en GitHub con la versión
 * de la app y abre su página para descargarla.
 */

import { app, shell } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import type { UpdateInfo } from '../ipc.ts'
import { handle } from './ipc.server.ts'

/** Repositorio donde se publican las releases. */
const REPOSITORY = 'abdedarghal111/cuanto-me-cuesta'
/** La API pública de GitHub admite 60 peticiones por hora e IP, así que la respuesta se guarda 15 minutos. */
const TTL = 15 * 60 * 1000

/** Última release publicada, tal y como se guarda. */
interface Release {
    tag: string
    url: string
    fetchedAt: number
}

/** Mira si hay una versión nueva y abre su página. */
export class UpdateController {
    /** Última release consultada, en la carpeta de datos de la app. */
    readonly #cachePath = path.join(app.getPath('userData'), 'ultima-version.json')

    /** Registra las órdenes del aviso de versiones nuevas. */
    register(): void {
        handle('checkUpdate', () => this.#check())
        handle('openRelease', async (url) => {
            if (url.startsWith(`https://github.com/${REPOSITORY}/releases/`)) {
                await shell.openExternal(url)
            }
        })
    }

    /**
     * Versión nueva publicada, si la hay.
     * @returns La versión y la página de su release, o `null` si no hay una más nueva o no se pudo comprobar.
     */
    async #check(): Promise<UpdateInfo | null> {
        const release = await this.#latest()
        const published = release && UpdateController.#parse(release.tag)
        const current = UpdateController.#parse(app.getVersion())
        if (!release || !published || !current || !UpdateController.#isNewer(published, current)) {
            return null
        }
        return { version: published.join('.'), url: release.url }
    }

    /**
     * Última release publicada: la guardada si es reciente o, si no, la de GitHub.
     * @returns La release, o `null` sin red, sin releases o con una respuesta inesperada.
     */
    async #latest(): Promise<Release | null> {
        try {
            const cached: Release = JSON.parse(fs.readFileSync(this.#cachePath, 'utf8'))
            if (Date.now() - cached.fetchedAt < TTL) {
                return cached
            }
        } catch {
            // Sin guardar todavía, o de otro formato: se consulta.
        }
        try {
            const response = await fetch(`https://api.github.com/repos/${REPOSITORY}/releases/latest`, {
                headers: { Accept: 'application/vnd.github+json' },
                signal: AbortSignal.timeout(10_000),
            })
            if (!response.ok) {
                return null
            }
            const { tag_name, html_url } = await response.json()
            if (typeof tag_name !== 'string' || typeof html_url !== 'string') {
                return null
            }
            const release = { tag: tag_name, url: html_url, fetchedAt: Date.now() }
            fs.mkdirSync(path.dirname(this.#cachePath), { recursive: true })
            fs.writeFileSync(this.#cachePath, JSON.stringify(release))
            return release
        } catch {
            // Es información secundaria: un fallo cuenta como «no hay nada nuevo».
            return null
        }
    }

    /**
     * Pasa una versión a números: "v1.2.3" → [1, 2, 3]. Se ignora lo que va tras `-` o `+` (`-beta`, `+4`).
     * @param raw Versión o tag.
     * @returns Sus números, o `null` si no es una versión.
     */
    static #parse(raw: string): number[] | null {
        const parts = raw.trim().replace(/^v/i, '').split(/[-+]/)[0].split('.').map(Number)
        return parts.every((n) => Number.isInteger(n) && n >= 0) ? parts : null
    }

    /**
     * Compara dos versiones número a número; las partes que faltan cuentan como cero (`1.2` es `1.2.0`). Como texto
     * no valdría: "1.10.0" quedaría antes que "1.9.0".
     * @returns Si `a` es más nueva que `b`.
     */
    static #isNewer(a: number[], b: number[]): boolean {
        for (let i = 0; i < Math.max(a.length, b.length); i++) {
            const diff = (a[i] ?? 0) - (b[i] ?? 0)
            if (diff !== 0) {
                return diff > 0
            }
        }
        return false
    }
}

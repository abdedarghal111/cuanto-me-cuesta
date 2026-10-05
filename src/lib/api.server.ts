/**
 * @file Servidor de la API (Node): la ruta `/api` lista, lee, escribe y borra los `.txt` de `datos/`
 * y sirve la plantilla `src/res/template.txt`. Se monta en el servidor de Vite como plugin.
 */

import type { Plugin } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import { TEMPLATE_INSTRUCTIONS } from './format.ts'

/** Carpeta de datos: un `titulo_fecha.txt` por producto. */
const DATA_DIR = path.resolve(import.meta.dirname, '../../datos')
/** Plantilla: lo que se ofrece al apuntar, las categorías de siempre y con qué empieza un producto nuevo. */
const TEMPLATE_PATH = path.resolve(import.meta.dirname, '../res/template.txt')

/** Lee `TEMPLATE_PATH` y le reescribe al final `TEMPLATE_INSTRUCTIONS` cuando faltan o no coinciden con las del programa. */
function readTemplate(): string {
    const text = fs.readFileSync(TEMPLATE_PATH, 'utf8')
    const start = text.search(/^INSTRUCCIONES/m)
    const instructions = start < 0 ? '' : text.slice(start).replace(/\r\n/g, '\n').trimEnd()
    if (instructions === TEMPLATE_INSTRUCTIONS) {
        return text
    }
    const body = (start < 0 ? text : text.slice(0, start)).trimEnd()
    const updated = `${body}\n\n${TEMPLATE_INSTRUCTIONS}\n`
    fs.writeFileSync(TEMPLATE_PATH, updated, 'utf8')
    return updated
}

/** Ruta dentro de `datos/` para un nombre `.txt` simple (sin rutas), o `null` si no es válido. */
function safeDataPath(name: string | null): string | null {
    if (!name || !/^[\w\-. ]+\.txt$/.test(name) || name.startsWith('.')) {
        return null
    }
    return path.join(DATA_DIR, name)
}

/** Lee el cuerpo completo de una petición como texto. */
function readBody(req: import('node:http').IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
        let body = ''
        req.setEncoding('utf8')
        req.on('data', (chunk) => (body += chunk))
        req.on('end', () => resolve(body))
        req.on('error', reject)
    })
}

/** Plugin que sirve `/api` para listar, leer, escribir y borrar los `.txt` de `datos/` y leer la plantilla. */
export function apiServer(): Plugin {
    return {
        name: 'api-server',
        configureServer(server) {
            fs.mkdirSync(DATA_DIR, { recursive: true })
            server.middlewares.use('/api', async (req, res) => {
                const url = new URL(req.url ?? '/', 'http://x')
                try {
                    if (url.pathname === '/files' && req.method === 'GET') {
                        const files = fs
                            .readdirSync(DATA_DIR)
                            .filter((f) => f.endsWith('.txt'))
                            .sort()
                        res.setHeader('Content-Type', 'application/json')
                        return res.end(JSON.stringify(files))
                    }
                    if (url.pathname === '/template' && req.method === 'GET') {
                        res.setHeader('Content-Type', 'text/plain; charset=utf-8')
                        return res.end(readTemplate())
                    }
                    if (url.pathname === '/file') {
                        const name = url.searchParams.get('name')
                        const filePath = safeDataPath(name)
                        if (!filePath || !name) {
                            res.statusCode = 400
                            return res.end('Nombre de archivo no válido')
                        }
                        if (req.method === 'GET') {
                            res.setHeader('Content-Type', 'text/plain; charset=utf-8')
                            return res.end(fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '')
                        }
                        if (req.method === 'PUT') {
                            fs.writeFileSync(filePath, await readBody(req), 'utf8')
                            // Con «previous» distinto, es un cambio de nombre: se elimina el archivo anterior.
                            const previousPath = safeDataPath(url.searchParams.get('previous'))
                            if (previousPath && previousPath !== filePath && fs.existsSync(previousPath)) {
                                fs.unlinkSync(previousPath)
                            }
                            return res.end('ok')
                        }
                        if (req.method === 'DELETE') {
                            // No se elimina: se renombra a `.txt.borrado`.
                            fs.renameSync(filePath, `${filePath}.borrado`)
                            return res.end('ok')
                        }
                    }
                    res.statusCode = 404
                    res.end('No existe')
                } catch (e) {
                    res.statusCode = 500
                    res.end(String(e))
                }
            })
        },
    }
}

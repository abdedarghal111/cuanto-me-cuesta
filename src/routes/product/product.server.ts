/**
 * @file Endpoints de los productos (Node): `/api/products` lista, lee, escribe y borra los `.txt` de `datos/`,
 * y `/api/templates` sirve las plantillas de `src/res/plantillas/`. `main.server.ts` los conecta al servidor de Vite.
 */

import type { Connect } from 'vite'
import fs from 'node:fs'
import path from 'node:path'

/** Carpeta de datos: un `titulo_fecha.txt` por hoja. */
const DATA_DIR = path.resolve(import.meta.dirname, '../../../datos')
/** Carpeta de plantillas: una hoja normal por oficio, de la que el asistente saca las hojas nuevas. */
const TEMPLATES_DIR = path.resolve(import.meta.dirname, '../../res/plantillas')

fs.mkdirSync(DATA_DIR, { recursive: true })

/** Ruta dentro de `datos/` para un nombre `.txt` simple (sin rutas), o `null` si no es válido. */
function safeDataPath(name: string | null): string | null {
    if (!name || !/^[\w\-. ]+\.txt$/.test(name) || name.startsWith('.')) {
        return null
    }
    return path.join(DATA_DIR, name)
}

/** Lee el cuerpo completo de una petición como texto. */
function readBody(req: Connect.IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
        let body = ''
        req.setEncoding('utf8')
        req.on('data', (chunk) => (body += chunk))
        req.on('end', () => resolve(body))
        req.on('error', reject)
    })
}

/**
 * `/api/products`: `GET /` lista los archivos; `GET`, `PUT` y `DELETE /<archivo>.txt` leen, escriben y borran uno.
 * Un `PUT` con `?previous=<archivo>.txt` distinto es un cambio de nombre: se elimina el archivo anterior.
 */
export const productsEndpoint: Connect.NextHandleFunction = async (req, res, next) => {
    const url = new URL(req.url ?? '/', 'http://x')
    if (url.pathname === '/') {
        if (req.method !== 'GET') {
            return next()
        }
        const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.txt')).sort()
        res.setHeader('Content-Type', 'application/json')
        return res.end(JSON.stringify(files))
    }
    const name = decodeURIComponent(url.pathname.slice(1))
    const filePath = safeDataPath(name)
    if (!filePath) {
        res.statusCode = 400
        return res.end('Nombre de archivo no válido')
    }
    if (req.method === 'GET') {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8')
        return res.end(fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '')
    }
    if (req.method === 'PUT') {
        fs.writeFileSync(filePath, await readBody(req), 'utf8')
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
    next()
}

/** `GET /api/templates`: el texto de cada plantilla, por orden de nombre de archivo, como un array JSON. */
export const templatesEndpoint: Connect.NextHandleFunction = (req, res, next) => {
    if (req.method !== 'GET' || req.url !== '/') {
        return next()
    }
    const files = fs.readdirSync(TEMPLATES_DIR).filter((f) => f.endsWith('.txt')).sort()
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(files.map((f) => fs.readFileSync(path.join(TEMPLATES_DIR, f), 'utf8'))))
}

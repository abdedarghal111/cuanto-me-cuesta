/**
 * @file Servidor de la API (Node): la ruta `/api` lista, lee, escribe y borra los `.txt` de `datos/`
 * y sirve la plantilla `src/res/template.txt`. Se monta en el servidor de Vite como plugin.
 */

import type { Plugin } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import { INSTRUCCIONES_PLANTILLA } from './formato'

/** Carpeta de datos: un `titulo_fecha.txt` por producto. */
const DATOS = path.resolve(import.meta.dirname, '../../datos')
/** Plantilla: lo que se ofrece al apuntar, las categorías de siempre y con qué empieza un producto nuevo. */
const PLANTILLA = path.resolve(import.meta.dirname, '../res/template.txt')

/** Lee `PLANTILLA` y le reescribe al final `INSTRUCCIONES_PLANTILLA` cuando faltan o no coinciden con las del programa. */
function plantillaAlDia(): string {
    const texto = fs.readFileSync(PLANTILLA, 'utf8')
    const i = texto.search(/^INSTRUCCIONES/m)
    const instrucciones = i < 0 ? '' : texto.slice(i).replace(/\r\n/g, '\n').trimEnd()
    if (instrucciones === INSTRUCCIONES_PLANTILLA) {
        return texto
    }
    const cuerpo = (i < 0 ? texto : texto.slice(0, i)).trimEnd()
    const nuevo = `${cuerpo}\n\n${INSTRUCCIONES_PLANTILLA}\n`
    fs.writeFileSync(PLANTILLA, nuevo, 'utf8')
    return nuevo
}

/** Ruta dentro de `datos/` para un nombre `.txt` simple (sin rutas), o `null` si no es válido. */
function rutaSegura(nombre: string | null): string | null {
    if (!nombre || !/^[\w\-. ]+\.txt$/.test(nombre) || nombre.startsWith('.')) {
        return null
    }
    return path.join(DATOS, nombre)
}

/** Lee el cuerpo completo de una petición como texto. */
function leerCuerpo(req: import('node:http').IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
        let cuerpo = ''
        req.setEncoding('utf8')
        req.on('data', (trozo) => (cuerpo += trozo))
        req.on('end', () => resolve(cuerpo))
        req.on('error', reject)
    })
}

/** Plugin que sirve `/api` para listar, leer, escribir y borrar los `.txt` de `datos/` y leer la plantilla. */
export function servidor(): Plugin {
    return {
        name: 'servidor',
        configureServer(server) {
            fs.mkdirSync(DATOS, { recursive: true })
            server.middlewares.use('/api', async (req, res) => {
                const url = new URL(req.url ?? '/', 'http://x')
                try {
                    if (url.pathname === '/archivos' && req.method === 'GET') {
                        const archivos = fs
                            .readdirSync(DATOS)
                            .filter((f) => f.endsWith('.txt'))
                            .sort()
                        res.setHeader('Content-Type', 'application/json')
                        return res.end(JSON.stringify(archivos))
                    }
                    if (url.pathname === '/plantilla' && req.method === 'GET') {
                        res.setHeader('Content-Type', 'text/plain; charset=utf-8')
                        return res.end(plantillaAlDia())
                    }
                    if (url.pathname === '/archivo') {
                        const nombre = url.searchParams.get('nombre')
                        const ruta = rutaSegura(nombre)
                        if (!ruta || !nombre) {
                            res.statusCode = 400
                            return res.end('Nombre de archivo no válido')
                        }
                        if (req.method === 'GET') {
                            res.setHeader('Content-Type', 'text/plain; charset=utf-8')
                            return res.end(fs.existsSync(ruta) ? fs.readFileSync(ruta, 'utf8') : '')
                        }
                        if (req.method === 'PUT') {
                            fs.writeFileSync(ruta, await leerCuerpo(req), 'utf8')
                            // Con «antes» distinto, es un cambio de nombre: se elimina el archivo anterior.
                            const antes = rutaSegura(url.searchParams.get('antes'))
                            if (antes && antes !== ruta && fs.existsSync(antes)) {
                                fs.unlinkSync(antes)
                            }
                            return res.end('ok')
                        }
                        if (req.method === 'DELETE') {
                            // No se elimina: se renombra a `.txt.borrado`.
                            fs.renameSync(ruta, `${ruta}.borrado`)
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

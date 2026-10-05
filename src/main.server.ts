/**
 * @file Servidor de la API (Node): conecta los endpoints de cada ruta de `routes/` al servidor de Vite,
 * que usa `connect`. Se monta en `vite.config.ts` como plugin.
 */

import type { Connect, Plugin } from 'vite'
import { productsEndpoint, templateEndpoint } from './routes/product/product.server.ts'

/** Endpoints de la API: ruta → función que la atiende. Para uno nuevo basta con añadirlo aquí. */
const ENDPOINTS: Record<string, Connect.NextHandleFunction> = {
    '/api/products': productsEndpoint,
    '/api/template': templateEndpoint,
}

/** Envuelve un endpoint para que un error responda 500 con su mensaje en lugar de dejar la petición colgada. */
const withErrors = (endpoint: Connect.NextHandleFunction): Connect.NextHandleFunction => async (req, res, next) => {
    try {
        await endpoint(req, res, next)
    } catch (e) {
        res.statusCode = 500
        res.end(String(e))
    }
}

/** Plugin que conecta `ENDPOINTS` y responde 404 al resto de `/api`. */
export function apiServer(): Plugin {
    return {
        name: 'api-server',
        configureServer(server) {
            for (const [route, endpoint] of Object.entries(ENDPOINTS)) {
                server.middlewares.use(route, withErrors(endpoint))
            }
            server.middlewares.use('/api', (_req, res) => {
                res.statusCode = 404
                res.end('No existe')
            })
        },
    }
}

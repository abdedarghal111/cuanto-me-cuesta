/** @file Llamadas de la ruta de producto (navegador): los archivos de `datos/` y las plantillas, a través de `product.server.ts`. */

async function request(url: string, init?: RequestInit): Promise<Response> {
    const response = await fetch(url, init)
    if (!response.ok) {
        throw new Error(await response.text())
    }
    return response
}

const productUrl = (name: string) => `/api/products/${encodeURIComponent(name)}`

export const listProducts = async (): Promise<string[]> => (await request('/api/products')).json()
export const readProduct = async (name: string): Promise<string> => (await request(productUrl(name))).text()
/** Lee las plantillas (`src/res/plantillas/`), hojas normales, por orden de nombre de archivo. */
export const readTemplates = async (): Promise<string[]> => (await request('/api/templates')).json()
/** Escribe el archivo. Con `previousName` distinto de `name`, elimina el anterior (cambio de nombre). */
export const saveProduct = async (name: string, text: string, previousName?: string) => {
    const query = previousName && previousName !== name ? `?previous=${encodeURIComponent(previousName)}` : ''
    await request(productUrl(name) + query, { method: 'PUT', body: text })
}
export const deleteProduct = async (name: string) => {
    await request(productUrl(name), { method: 'DELETE' })
}

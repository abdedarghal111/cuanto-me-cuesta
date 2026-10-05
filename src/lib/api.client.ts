/** @file Cliente de la API (navegador): acceso a los archivos de `datos/` y a la plantilla a través del servidor de `api.server.ts`. */

async function request(url: string, init?: RequestInit): Promise<Response> {
    const response = await fetch(url, init)
    if (!response.ok) {
        throw new Error(await response.text())
    }
    return response
}

const fileUrl = (name: string) => `/api/file?name=${encodeURIComponent(name)}`

export const listFiles = async (): Promise<string[]> => (await request('/api/files')).json()
export const readFile = async (name: string): Promise<string> => (await request(fileUrl(name))).text()
/** Lee la plantilla (`src/res/template.txt`); el servidor pone al día sus instrucciones. */
export const readTemplate = async (): Promise<string> => (await request('/api/template')).text()
/** Escribe el archivo. Con `previousName` distinto de `name`, elimina el anterior (cambio de nombre). */
export const writeFile = async (name: string, text: string, previousName?: string) => {
    const query = previousName && previousName !== name ? `&previous=${encodeURIComponent(previousName)}` : ''
    await request(fileUrl(name) + query, { method: 'PUT', body: text })
}
export const deleteFile = async (name: string) => {
    await request(fileUrl(name), { method: 'DELETE' })
}

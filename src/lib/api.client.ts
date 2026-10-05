/** @file Cliente de la API (navegador): acceso a los archivos de `datos/` y a la plantilla a través del servidor de `api.server.ts`. */

async function pedir(url: string, init?: RequestInit): Promise<Response> {
    const r = await fetch(url, init)
    if (!r.ok) {
        throw new Error(await r.text())
    }
    return r
}

const ruta = (nombre: string) => `/api/archivo?nombre=${encodeURIComponent(nombre)}`

export const listar = async (): Promise<string[]> => (await pedir('/api/archivos')).json()
export const leer = async (nombre: string): Promise<string> => (await pedir(ruta(nombre))).text()
/** Lee la plantilla (`src/res/template.txt`); el servidor pone al día sus instrucciones. */
export const leerPlantilla = async (): Promise<string> => (await pedir('/api/plantilla')).text()
/** Escribe el archivo. Con `antes` distinto de `nombre`, elimina el anterior (cambio de nombre). */
export const escribir = async (nombre: string, texto: string, antes?: string) => {
    const extra = antes && antes !== nombre ? `&antes=${encodeURIComponent(antes)}` : ''
    await pedir(ruta(nombre) + extra, { method: 'PUT', body: texto })
}
export const borrar = async (nombre: string) => {
    await pedir(ruta(nombre), { method: 'DELETE' })
}

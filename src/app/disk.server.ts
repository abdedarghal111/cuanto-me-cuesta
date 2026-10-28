/**
 * @file Escritura segura de archivos (proceso principal).
 */

import fs from 'node:fs'
import path from 'node:path'

/**
 * Escribe un archivo sin riesgo de dejarlo a medias: primero un temporal oculto en la misma carpeta y luego lo
 * renombra encima del original, que es una operación atómica.
 * @param file Ruta del archivo.
 * @param text Contenido.
 */
export function writeSafely(file: string, text: string): void {
    fs.mkdirSync(path.dirname(file), { recursive: true })
    const temp = path.join(path.dirname(file), `.~${path.basename(file)}.tmp`)
    fs.writeFileSync(temp, text, 'utf8')
    fs.renameSync(temp, file)
}

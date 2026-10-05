/**
 * @file Formato de los archivos de producto y de plantilla: lectura, escritura y cuentas.
 * Reúne la API pública de los módulos de `formato/`, para importarla desde un solo sitio.
 */

export { hoy, nombreDeArchivo } from './formato/archivo.ts'
export { SIN_TAG, limpiarTag, listaDeTags, usados } from './formato/categorias.ts'
export { aTexto } from './formato/escritura.ts'
export { INSTRUCCIONES_PLANTILLA } from './formato/instrucciones.ts'
export { deTexto, plantillaDeTexto } from './formato/lectura.ts'
export { coste, recargo } from './formato/lineas.ts'
export { TIPOS, lineaVacia, recargoVacio, type Documento, type Linea, type Plantilla, type Recargo, type Seccion, type Tipo } from './formato/modelo.ts'
export { UNIDADES_TIEMPO, aDuracion, aNumero, euros, numero, pct, segundos, unidadTiempo } from './formato/numeros.ts'
export { resumir, type Resumen } from './formato/resumen.ts'

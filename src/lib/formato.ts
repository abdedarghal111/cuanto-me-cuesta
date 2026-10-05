/**
 * @file Formato de los archivos de producto y de plantilla: lectura, escritura y cuentas.
 * Reúne la API pública de los módulos de `formato/`, para importarla desde un solo sitio.
 */

export { SIN_TAG, limpiarTag, listaDeTags, usados } from './formato/categorias'
export { coste, recargo } from './formato/lineas'
export { TIPOS, lineaVacia, recargoVacio, type Documento, type Linea, type Plantilla, type Recargo, type Seccion, type Tipo } from './formato/modelo'
export { UNIDADES_TIEMPO, aDuracion, aNumero, euros, numero, pct, segundos, unidadTiempo } from './formato/numeros'
export { resumir, type Resumen } from './formato/resumen'

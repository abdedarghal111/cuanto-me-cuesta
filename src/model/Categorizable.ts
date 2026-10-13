/**
 * @file Interfaz de lo que lleva una categoría.
 */

/** Objeto con una categoría; vacía es «Sin categoría». La categoría solo la pone `CostSheet.assignCategory()`. */
export interface Categorizable {
    /**
     * Da la categoría.
     * @returns La categoría.
     */
    getCategory(): string
    /**
     * Cambia la categoría sin comprobarla. Interno: solo lo usa `CostSheet`, que es quien la comprueba.
     * @param category Categoría nueva.
     */
    setCategory(category: string): void
}

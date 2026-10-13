/**
 * @file Interfaz de los objetos del modelo que avisan cuando cambian (patrón observador).
 */

/** Objeto que avisa a quien se suscriba cada vez que cambia, él o uno de sus hijos. */
export interface Observable {
    /**
     * Suscribe una función a los cambios.
     * @param listener Función que se llama en cada cambio.
     * @returns Función que anula la suscripción.
     */
    subscribe(listener: () => void): () => void
    /** Avisa a los suscritos de que el objeto ha cambiado. */
    notify(): void
}

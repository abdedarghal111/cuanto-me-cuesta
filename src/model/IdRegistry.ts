/**
 * @file Identificadores fijos de los objetos de una hoja (la hoja, sus secciones, líneas y recargos), para que la
 * ventana los nombre en sus órdenes y los reconozca de una foto a la siguiente.
 */

/** Da a cada objeto un identificador que no cambia mientras exista, y encuentra el objeto por su identificador. */
export class IdRegistry {
    /** Prefijo de los identificadores, para que no se repitan entre hojas. */
    readonly #prefix: string
    #next = 1
    #ids = new WeakMap<object, string>()
    /** Objetos de la última foto, por identificador. */
    #objects = new Map<string, object>()

    /**
     * Crea el registro.
     * @param prefix Prefijo de sus identificadores.
     */
    constructor(prefix: string) {
        this.#prefix = prefix
    }

    /**
     * Identificador de un objeto; se le da uno nuevo la primera vez.
     * @param object Objeto de la hoja.
     * @returns Su identificador.
     */
    id(object: object): string {
        let id = this.#ids.get(object)
        if (!id) {
            id = `${this.#prefix}-${this.#next++}`
            this.#ids.set(object, id)
        }
        this.#objects.set(id, object)
        return id
    }

    /**
     * Objeto de la última foto con ese identificador.
     * @param id Identificador.
     * @returns El objeto.
     * @throws {Error} Si no hay ninguno.
     */
    get(id: string): object {
        const object = this.#objects.get(id)
        if (!object) {
            throw new Error(`No existe el elemento ${id}.`)
        }
        return object
    }

    /** Empieza una foto nueva: olvida los objetos de la anterior, que se vuelven a apuntar con `id()`. */
    reset(): void {
        this.#objects.clear()
    }
}

/**
 * @file Adjuntos de los campos que editan la hoja (ventana): muestran el valor que manda el proceso principal sin
 * pisar lo que se está tecleando, y ponen el foco en la fila recién creada.
 */

import type { Attachment } from 'svelte/attachments'

/**
 * Muestra en un campo un valor de la hoja. Mientras el campo tiene el foco no lo cambia, para no pisar lo que se
 * teclea con una respuesta atrasada; al salir del campo toma el valor que haya dejado el proceso principal (p. ej.
 * normalizado).
 * @param get Lee el valor de la foto de la hoja.
 * @returns El adjunto del campo.
 */
export function liveValue(get: () => string): Attachment<HTMLInputElement | HTMLTextAreaElement> {
    return (field) => {
        const value = get()
        if (document.activeElement !== field && field.value !== value) {
            field.value = value
        }
        const sync = () => {
            field.value = get()
        }
        field.addEventListener('blur', sync)
        return () => field.removeEventListener('blur', sync)
    }
}

/** Identificador de la fila recién creada que debe tomar el foco al aparecer. */
let pendingFocus: string | null = null

/**
 * Pone el foco en un campo, al final del texto.
 * @param field Campo.
 */
function focusEnd(field: HTMLInputElement): void {
    field.focus()
    field.setSelectionRange(field.value.length, field.value.length)
}

/**
 * Pasa el foco al campo de una fila recién creada; si aún no ha llegado en la foto, lo toma al aparecer.
 * @param id Identificador de la fila, el de su campo `focusOnCreate`.
 */
export function focusWhenCreated(id: string | null): void {
    const field = id ? document.querySelector<HTMLInputElement>(`[data-row="${id}"]`) : null
    if (field) {
        focusEnd(field)
    } else {
        pendingFocus = id
    }
}

/**
 * Campo que toma el foco si es el de la fila recién creada. El campo lleva `data-row` con el identificador de su fila.
 * @param id Identificador de la fila del campo.
 * @returns El adjunto del campo.
 */
export function focusOnCreate(id: string): Attachment<HTMLInputElement> {
    return (field) => {
        if (pendingFocus === id) {
            pendingFocus = null
            focusEnd(field)
        }
    }
}

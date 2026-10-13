<!--
    @component
    Botones de subir, bajar y quitar un elemento de una lista del producto abierto (una línea o un recargo).
    `move` y `remove` también se usan sueltos, por ejemplo con los bloques.
-->

<script lang="ts" module>
    import { ask } from './Dialog.svelte'

    /**
     * Cambia el elemento `index` de sitio con el de al lado.
     * @param list Lista actual.
     * @param index Posición del elemento.
     * @param step Hacia dónde se mueve: -1 sube y 1 baja.
     * @param reorder Asigna la lista en el orden nuevo (el setter del modelo, que avisa del cambio).
     */
    export function move<T>(list: T[], index: number, step: -1 | 1, reorder: (list: T[]) => void) {
        const other = index + step
        if (other < 0 || other >= list.length) {
            return
        }
        const reordered = [...list]
        ;[reordered[index], reordered[other]] = [reordered[other], reordered[index]]
        reorder(reordered)
    }

    /**
     * Quita un elemento; con `confirmTitle`, antes pide confirmarlo.
     * @param removeItem Quita el elemento (el `remove…` del modelo, que avisa del cambio).
     * @param confirmTitle Título del diálogo de confirmación.
     */
    export async function remove(removeItem: () => void, confirmTitle?: string) {
        if (confirmTitle && !(await ask({ title: confirmTitle, confirmLabel: 'Quitar', danger: true }))) {
            return
        }
        removeItem()
    }
</script>

<script lang="ts" generics="T">
    import Icon from './Icon.svelte'

    let {
        list,
        index,
        reorder,
        onremove,
    }: { list: T[]; index: number; reorder: (list: T[]) => void; onremove: () => void } = $props()
</script>

<span class="inline-flex">
    <button class="mini px-0.5" onclick={() => move(list, index, -1, reorder)} title="Subir" aria-label="Subir"><Icon name="up" size={16} /></button>
    <button class="mini px-0.5" onclick={() => move(list, index, 1, reorder)} title="Bajar" aria-label="Bajar"><Icon name="down" size={16} /></button>
    <button class="mini px-0.5" onclick={() => remove(onremove)} title="Quitar" aria-label="Quitar"><Icon name="remove" size={16} /></button>
</span>

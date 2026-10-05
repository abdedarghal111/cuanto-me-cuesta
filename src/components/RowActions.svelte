<!--
    @component
    Botones de subir, bajar y quitar un elemento de una lista del producto abierto (una línea o un recargo).
    `move` y `remove` también se usan sueltos, por ejemplo con los bloques.
-->

<script lang="ts" module>
    import { ask } from './Dialog.svelte'
    import { store } from '../store.client.svelte.ts'

    /** Cambia el elemento `index` de sitio con el de al lado. */
    export function move<T>(list: T[], index: number, step: -1 | 1) {
        const other = index + step
        if (other < 0 || other >= list.length) {
            return
        }
        ;[list[index], list[other]] = [list[other], list[index]]
        store.markChanged()
    }

    /** Quita el elemento `index`; con `confirmTitle`, antes pide confirmarlo. */
    export async function remove<T>(list: T[], index: number, confirmTitle?: string) {
        if (confirmTitle && !(await ask({ title: confirmTitle, confirmLabel: 'Quitar', danger: true }))) {
            return
        }
        list.splice(index, 1)
        store.markChanged()
    }
</script>

<script lang="ts">
    import Icon from './Icon.svelte'

    let { list, index }: { list: unknown[]; index: number } = $props()
</script>

<span class="inline-flex">
    <button class="mini px-0.5" onclick={() => move(list, index, -1)} title="Subir" aria-label="Subir"><Icon name="up" size={16} /></button>
    <button class="mini px-0.5" onclick={() => move(list, index, 1)} title="Bajar" aria-label="Bajar"><Icon name="down" size={16} /></button>
    <button class="mini px-0.5" onclick={() => remove(list, index)} title="Quitar" aria-label="Quitar"><Icon name="remove" size={16} /></button>
</span>

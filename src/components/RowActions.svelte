<!--
    @component
    Botones de subir, bajar y quitar un elemento de una lista del producto abierto (una línea, un recargo
    o una sección), con confirmación opcional antes de quitar.
-->

<script lang="ts" generics="T">
    import { ask } from './Dialog.svelte'
    import Icon from './Icon.svelte'

    let {
        list,
        index,
        reorder,
        onremove,
        confirm,
        label,
        size = 16,
    }: {
        /** Lista actual en la que está el elemento. */
        list: T[]
        /** Posición del elemento en `list`. */
        index: number
        /** Asigna la lista en el orden nuevo (el setter del modelo, que avisa del cambio). */
        reorder: (list: T[]) => void
        /** Quita el elemento (el `remove…` del modelo, que avisa del cambio). */
        onremove: () => void
        /** Si se indica, título del diálogo que pide confirmar antes de quitar. */
        confirm?: string
        /** Qué es el elemento, para el título de los botones («Subir sección»). */
        label?: string
        /** Tamaño de los iconos. */
        size?: number
    } = $props()

    /** Texto que se añade al título de cada botón. */
    const suffix = $derived(label ? ` ${label}` : '')
    /** Con el tamaño por defecto, los botones van más juntos. */
    const padding = $derived(size === 16 ? 'px-0.5' : '')

    /**
     * Cambia el elemento `index` de sitio con el de al lado y asigna la lista en el orden nuevo con `reorder`.
     * En los extremos de la lista no hace nada.
     * @param step Hacia dónde se mueve: -1 sube y 1 baja.
     */
    function move(step: -1 | 1) {
        const other = index + step
        if (other < 0 || other >= list.length) {
            return
        }
        const reordered = [...list]
        ;[reordered[index], reordered[other]] = [reordered[other], reordered[index]]
        reorder(reordered)
    }

    /**
     * Quita el elemento con `onremove`; si hay `confirm`, antes pide confirmarlo con un diálogo con ese título
     * y no hace nada si se cancela.
     */
    async function remove() {
        if (confirm && !(await ask({ title: confirm, confirmLabel: 'Quitar', danger: true }))) {
            return
        }
        onremove()
    }
</script>

<span class="inline-flex">
    <button class="mini {padding}" onclick={() => move(-1)} title="Subir{suffix}" aria-label="Subir{suffix}"><Icon name="up" {size} /></button>
    <button class="mini {padding}" onclick={() => move(1)} title="Bajar{suffix}" aria-label="Bajar{suffix}"><Icon name="down" {size} /></button>
    <button class="mini {padding}" onclick={remove} title="Quitar{suffix}" aria-label="Quitar{suffix}"><Icon name="remove" {size} /></button>
</span>

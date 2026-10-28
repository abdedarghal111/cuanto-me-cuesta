<!--
    @component
    Botones de subir, bajar y quitar un elemento de la hoja (una línea, un recargo o una sección), con confirmación
    opcional antes de quitar. Mandan la orden al proceso principal, que no hace nada en los extremos de la lista.
-->

<script lang="ts">
    import { store } from '../store.client.svelte.ts'
    import { ask } from './Dialog.svelte'
    import Icon from './Icon.svelte'

    let {
        id,
        confirm,
        label,
        size = 16,
    }: {
        /** Identificador del elemento. */
        id: string
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

    /** Quita el elemento; si hay `confirm`, antes pide confirmarlo y no hace nada si se cancela. */
    async function remove() {
        if (confirm && !(await ask({ title: confirm, confirmLabel: 'Quitar', danger: true }))) {
            return
        }
        store.edit({ op: 'remove', id })
    }
</script>

<span class="inline-flex">
    <button class="mini {padding}" onclick={() => store.edit({ op: 'move', id, step: -1 })} title="Subir{suffix}" aria-label="Subir{suffix}"><Icon name="up" {size} /></button>
    <button class="mini {padding}" onclick={() => store.edit({ op: 'move', id, step: 1 })} title="Bajar{suffix}" aria-label="Bajar{suffix}"><Icon name="down" {size} /></button>
    <button class="mini {padding}" onclick={remove} title="Quitar{suffix}" aria-label="Quitar{suffix}"><Icon name="remove" {size} /></button>
</span>

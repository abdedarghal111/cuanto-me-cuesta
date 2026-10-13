<!--
    @component
    Desplegable para elegir la categoría de una línea o un recargo entre las del producto abierto,
    o crear una nueva.
-->

<script lang="ts">
    import { softColor, tagColor } from '../colors.ts'
    import { askName } from './Dialog.svelte'
    import { Category } from '../model/Category.ts'
    import type { LineItem } from '../model/LineItem.ts'
    import { store } from '../store.client.svelte.ts'

    let { item }: { item: LineItem } = $props()

    /** Valor de la opción que crea una categoría nueva. */
    const NEW_TAG_OPTION = '__new_tag__'
    const color = $derived(tagColor(item.category, store.tags))

    async function onChange(e: Event & { currentTarget: HTMLSelectElement }) {
        const select = e.currentTarget
        if (select.value !== NEW_TAG_OPTION) {
            store.product?.assignCategory(item, select.value)
            return
        }
        // Mientras se escribe el nombre, el desplegable sigue mostrando la categoría anterior.
        select.value = item.category
        const tag = Category.clean((await askName('Nueva categoría')) ?? '')
        if (!tag) {
            return
        }
        store.product?.addCategory(tag)
        store.product?.assignCategory(item, tag)
    }
</script>

<select
    class="w-28 cursor-pointer rounded-[3px] border px-1.5 py-0.5 text-sm"
    style:background={softColor(color)}
    style:border-color={color}
    value={item.category}
    onchange={onChange}
    aria-label="Categoría"
>
    {#if !store.product?.categories.includes(item.category)}<option value={item.category} style:background="white">{item.category || '— sin categoría —'}</option>{/if}
    {#each store.product?.categories ?? [] as tag (tag)}
        <option value={tag} style:background={softColor(tagColor(tag, store.tags))} style:color="var(--ink)">{tag}</option>
    {/each}
    <option value={NEW_TAG_OPTION} style:background="white" style:color="var(--accent)">+ nueva categoría…</option>
</select>

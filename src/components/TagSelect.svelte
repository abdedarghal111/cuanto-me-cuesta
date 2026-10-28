<!--
    @component
    Desplegable para elegir la categoría de una línea o un recargo entre las de la hoja, o crear una nueva.
-->

<script lang="ts" module>
    /** Valor de la opción que crea una categoría nueva. */
    const NEW_TAG_OPTION = '__new_tag__'
</script>

<script lang="ts">
    import { softColor, tagColor } from '../colors.ts'
    import type { ItemView } from '../model/SheetView.ts'
    import { store } from '../store.client.svelte.ts'
    import { askName } from './Dialog.svelte'

    /** `item` es una línea o un recargo de una hoja con las categorías `categories`. */
    let { item, categories }: { item: ItemView; categories: string[] } = $props()

    const color = $derived(tagColor(item.category, store.tags))

    /**
     * Pone la categoría elegida; con «+ nueva categoría…», pide el nombre, la declara y se la pone.
     * @param e Cambio del desplegable.
     * @returns Promesa que se cumple al mandar el cambio o al cerrar el diálogo.
     */
    async function onChange(e: Event & { currentTarget: HTMLSelectElement }) {
        const select = e.currentTarget
        if (select.value !== NEW_TAG_OPTION) {
            await store.edit({ op: 'assignCategory', id: item.id, category: select.value })
            return
        }
        // Mientras se escribe el nombre, el desplegable sigue mostrando la categoría anterior.
        select.value = item.category
        const name = await askName('Nueva categoría')
        if (name) {
            await store.edit({ op: 'addCategory', name, assignTo: item.id })
        }
    }
</script>

<select
    class="w-28 rounded-[3px] border px-1.5 py-0.5 text-sm"
    style:background={softColor(color)}
    style:border-color={color}
    value={item.category}
    onchange={onChange}
    aria-label="Categoría"
>
    {#if !categories.includes(item.category)}<option value={item.category} style:background="white">{item.category || '— sin categoría —'}</option>{/if}
    {#each categories as tag (tag)}
        <option value={tag} style:background={softColor(tagColor(tag, store.tags))} style:color="var(--ink)">{tag}</option>
    {/each}
    <option value={NEW_TAG_OPTION} style:background="white" style:color="var(--accent)">+ nueva categoría…</option>
</select>

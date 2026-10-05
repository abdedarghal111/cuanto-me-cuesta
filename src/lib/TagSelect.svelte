<!--
    @component
    Desplegable para elegir la categoría de una línea o un recargo entre las del producto abierto,
    o crear una nueva.
-->

<script lang="ts" module>
    import { ask } from './Dialog.svelte'
    import { cleanTag } from './format.ts'

    /** Pide el nombre de una categoría nueva; `null` si se cancela o queda vacío. */
    export async function askNewTag(): Promise<string | null> {
        const tag = await ask({ title: 'Nueva categoría', message: '¿Cómo se llama?', value: '', confirmLabel: 'Crear' })
        return tag ? cleanTag(tag) || null : null
    }
</script>

<script lang="ts">
    import { softColor, tagColor } from './colors.ts'
    import { store } from './store.client.svelte.ts'

    let { item }: { item: { tag: string } } = $props()

    /** Valor de la opción que crea una categoría nueva. */
    const NEW_TAG_OPTION = '__new_tag__'
    const color = $derived(tagColor(item.tag.trim(), store.tags))

    async function onChange(e: Event & { currentTarget: HTMLSelectElement }) {
        const select = e.currentTarget
        if (select.value !== NEW_TAG_OPTION) {
            item.tag = select.value
            return store.markChanged()
        }
        // Mientras se escribe el nombre, el desplegable sigue mostrando la categoría anterior.
        select.value = item.tag.trim()
        const tag = await askNewTag()
        if (!tag) {
            return
        }
        store.ensureTag(tag)
        item.tag = tag
        store.markChanged()
    }
</script>

<select
    class="w-28 cursor-pointer rounded-[3px] border px-1.5 py-0.5 text-sm"
    style:background={softColor(color)}
    style:border-color={color}
    value={item.tag.trim()}
    onchange={onChange}
    aria-label="Categoría"
>
    {#if !store.product?.tags.includes(item.tag.trim())}<option value={item.tag.trim()} style:background="white">{item.tag.trim() || '— sin categoría —'}</option>{/if}
    {#each store.product?.tags ?? [] as tag (tag)}
        <option value={tag} style:background={softColor(tagColor(tag, store.tags))} style:color="var(--ink)">{tag}</option>
    {/each}
    <option value={NEW_TAG_OPTION} style:background="white" style:color="var(--accent)">+ nueva categoría…</option>
</select>

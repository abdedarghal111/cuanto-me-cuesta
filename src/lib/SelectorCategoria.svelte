<!--
    @component
    Desplegable para elegir la categoría de una línea o un recargo entre las del producto abierto,
    o crear una nueva.
-->

<script lang="ts" module>
    import { limpiarTag } from './formato.ts'
    import { preguntar } from './Dialogo.svelte'

    /** Pide el nombre de una categoría nueva; `null` si se cancela o queda vacío. */
    export async function pedirCategoria(): Promise<string | null> {
        const t = await preguntar({ titulo: 'Nueva categoría', mensaje: '¿Cómo se llama?', valor: '', aceptar: 'Crear' })
        return t ? limpiarTag(t) || null : null
    }
</script>

<script lang="ts">
    import { documentos } from './documentos.client.svelte.ts'
    import { colorDe, suave } from './colores.ts'

    let { l }: { l: { tag: string } } = $props()

    /** Valor de la opción que crea una categoría nueva. */
    const NUEVO_TAG = '__nuevo_tag__'
    const color = $derived(colorDe(l.tag.trim(), documentos.tags))

    async function elegir(e: Event & { currentTarget: HTMLSelectElement }) {
        const select = e.currentTarget
        if (select.value !== NUEVO_TAG) {
            l.tag = select.value
            return documentos.cambiado()
        }
        // Mientras se escribe el nombre, el desplegable sigue mostrando la categoría anterior.
        select.value = l.tag.trim()
        const tag = await pedirCategoria()
        if (!tag) {
            return
        }
        documentos.asegurarTag(tag)
        l.tag = tag
        documentos.cambiado()
    }
</script>

<select
    class="w-28 cursor-pointer rounded-[3px] border px-1.5 py-0.5 text-sm"
    style:background={suave(color)}
    style:border-color={color}
    value={l.tag.trim()}
    onchange={elegir}
    aria-label="Categoría"
>
    {#if !documentos.doc?.tags.includes(l.tag.trim())}<option value={l.tag.trim()} style:background="white">{l.tag.trim() || '— sin categoría —'}</option>{/if}
    {#each documentos.doc?.tags ?? [] as t (t)}
        <option value={t} style:background={suave(colorDe(t, documentos.tags))} style:color="var(--ink)">{t}</option>
    {/each}
    <option value={NUEVO_TAG} style:background="white" style:color="var(--accent)">+ nueva categoría…</option>
</select>

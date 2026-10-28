<!--
    @component
    Ficha de la hoja que se ve: nombre, fecha, acciones (ver texto, clonar, guardar como, descartar, cerrar la hoja),
    su archivo, descripción y categorías con lo que suma cada una.
-->

<script lang="ts">
    import { api } from '../api.client.ts'
    import { softColor, tagColor } from '../colors.ts'
    import { liveValue } from '../fields.client.ts'
    import type { DocumentInfo } from '../ipc.ts'
    import type { SheetView } from '../model/SheetView.ts'
    import { formatEuros } from '../model/text/numbers.ts'
    import { store, today } from '../store.client.svelte.ts'
    import { ask, askName } from './Dialog.svelte'
    import Icon from './Icon.svelte'

    let { document: doc, view }: { document: DocumentInfo; view: SheetView } = $props()

    /**
     * Escribe un campo de la hoja.
     * @param field Campo.
     * @param value Valor nuevo.
     */
    const set = (field: 'name' | 'date' | 'description', value: string) => store.edit({ op: 'set', id: view.id, field, value })

    async function duplicate() {
        const name = await askName('Clonar producto', `${view.name} (copia)`, 'Clonar')
        if (name) {
            store.select(await api.create({ from: 'copy', documentId: doc.id, name, date: today() }))
        }
    }

    async function discard() {
        const confirmed = await ask({
            title: 'Descartar cambios',
            message: doc.path
                ? 'Se vuelve a lo que hay guardado en el archivo y se pierde lo que no has guardado.'
                : 'La hoja aún no está guardada en ningún archivo, así que se cierra.',
            confirmLabel: 'Descartar',
            danger: true,
        })
        if (confirmed) {
            store.textMode = false
            await api.discard(doc.id)
        }
    }

    /**
     * Declara la categoría escrita en su hueco y vacía el hueco; un nombre vacío no declara nada.
     * @param input Hueco «Nueva categoría…».
     */
    function addTag(input: HTMLInputElement) {
        store.edit({ op: 'addCategory', name: input.value })
        input.value = ''
    }

    /**
     * Quita una categoría; si la usa alguna fila, antes pide confirmarlo.
     * @param tag Categoría y cuántas filas la usan.
     */
    async function removeTag({ name, items }: SheetView['categories'][number]) {
        if (items) {
            const confirmed = await ask({
                title: `Quitar la categoría «${name}»`,
                message: `${items === 1 ? 'Una línea la usa y se quedará' : `${items} líneas la usan y se quedarán`} sin categoría.`,
                confirmLabel: 'Quitar',
                danger: true,
            })
            if (!confirmed) {
                return
            }
        }
        store.edit({ op: 'removeCategory', name })
    }
</script>

<div class="paper grid gap-2.5 px-5 py-[18px]">
    <div class="flex flex-wrap items-end justify-between gap-3">
        <input
            class="editable-title hand-title min-w-0 flex-[1_1_300px] text-[50px]"
            {@attach liveValue(() => view.name)}
            oninput={(e) => set('name', e.currentTarget.value)}
            aria-label="Nombre del producto"
        />
        <div class="flex flex-wrap items-center gap-2.5 text-base">
            <input type="date" class="font-mono text-sm" {@attach liveValue(() => view.date)} onchange={(e) => set('date', e.currentTarget.value)} aria-label="Fecha" />
            <button class="button-soft {store.textMode ? 'bg-[#FFF4A8]!' : ''}" onclick={() => (store.textMode = true)}>Ver texto</button>
            <button class="button-soft" onclick={duplicate}>Clonar</button>
            <button class="button-soft" onclick={() => api.saveAs(doc.id)} title="Ctrl+Mayús+S">Guardar como…</button>
            {#if doc.dirty}<button class="button-soft" onclick={discard}>Descartar cambios</button>{/if}
            <button class="button-soft" onclick={() => api.close(doc.id)} title="La quita de la app; su archivo se queda donde está">Cerrar hoja</button>
        </div>
    </div>
    <span class="font-mono text-xs text-muted">{doc.path ?? 'Sin archivo todavía: al guardar elijo dónde'}</span>
    <label class="grid gap-1 font-bold">
        Descripción
        <textarea
            class="resize-y rounded border border-[#E6D77A] bg-[#FFFBE0] px-3 py-2 text-[17px] leading-normal font-normal"
            {@attach liveValue(() => view.description)}
            oninput={(e) => set('description', e.currentTarget.value)}
            rows="3"
            placeholder="Anotaciones para todo el documento: para quién es, qué se reaprovechó, qué falta por saber…"
        ></textarea>
    </label>
    <div class="grid gap-1.5">
        <span class="font-bold">Categorías de este documento</span>
        <div class="flex flex-wrap items-center gap-2">
            {#each view.categories as tag (tag.name)}
                {@const color = tagColor(tag.name, store.tags)}
                <span
                    class="inline-flex items-center gap-1.5 rounded-[3px] border py-0.5 pr-1 pl-2.5 text-[15px]"
                    style:background={softColor(color)}
                    style:border-color={color}
                    title="{tag.items} líneas"
                >
                    {tag.name}
                    <span class="font-mono text-xs text-muted">{formatEuros(tag.amount)}</span>
                    <button class="mini px-0.5" onclick={() => removeTag(tag)} aria-label="Quitar la categoría {tag.name}" title="Quitar categoría">
                        <Icon name="remove" size={14} />
                    </button>
                </span>
            {/each}
            <input
                class="tag-ghost"
                placeholder="Nueva categoría…"
                onchange={(e) => addTag(e.currentTarget)}
                onkeydown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                aria-label="Nueva categoría"
            />
        </div>
    </div>
</div>

<style lang="postcss">
    @reference '../app.css';

    /* Hueco para escribir una categoría nueva, como una etiqueta más con el borde discontinuo. */
    .tag-ghost {
        @apply w-40 rounded-[3px] border border-dashed border-[#AEBCCB] bg-white px-2.5 py-0.5 text-[15px] italic placeholder:text-[#9AA9B8];
    }
</style>

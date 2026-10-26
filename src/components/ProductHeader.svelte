<!--
    @component
    Ficha del producto abierto: nombre, fecha, acciones (ver texto, clonar, descartar, borrar),
    descripción y categorías con lo que suma cada una.
-->

<script lang="ts">
    import { softColor, tagColor } from '../colors.ts'
    import { ask, askName } from './Dialog.svelte'
    import type { CostSheet } from '../model/CostSheet.ts'
    import { formatEuros } from '../model/text/numbers.ts'
    import Icon from './Icon.svelte'
    import { store } from '../store.client.svelte.ts'

    let { product }: { product: CostSheet } = $props()

    async function duplicate() {
        const name = await askName('Clonar producto', `${product.name} (copia)`, 'Clonar')
        if (name) {
            store.create(name, product)
        }
    }

    async function discard() {
        const confirmed = await ask({
            title: 'Descartar cambios',
            message: 'Se vuelve a lo que hay guardado en el archivo y se pierde lo que no has guardado.',
            confirmLabel: 'Descartar',
            danger: true,
        })
        if (confirmed) {
            await store.discard()
        }
    }

    async function deleteProduct() {
        const confirmed = await ask({
            title: `Borrar «${product.name}»`,
            message: `El archivo se queda como datos/${store.selected}.borrado, por si acaso.`,
            confirmLabel: 'Borrar',
            danger: true,
        })
        if (confirmed) {
            await store.delete()
        }
    }

    /**
     * Declara en el producto la categoría escrita en su hueco y vacía el hueco; un nombre vacío no declara nada.
     * @param input Hueco «Nueva categoría…».
     */
    function addTag(input: HTMLInputElement) {
        product.addCategory(input.value)
        input.value = ''
    }

    /**
     * Líneas y recargos del producto que usan la categoría, y lo que suman.
     * @param tag Categoría del producto.
     * @returns Las líneas y recargos (`items`) y su importe (`cost`).
     */
    const tagUsage = (tag: string) => ({ items: product.itemsInCategory(tag), cost: store.summary?.byCategory.get(tag) ?? 0 })

    async function removeTag(tag: string) {
        const { items } = tagUsage(tag)
        if (items.length) {
            const confirmed = await ask({
                title: `Quitar la categoría «${tag}»`,
                message: `${items.length === 1 ? 'Una línea la usa y se quedará' : `${items.length} líneas la usan y se quedarán`} sin categoría.`,
                confirmLabel: 'Quitar',
                danger: true,
            })
            if (!confirmed) {
                return
            }
        }
        product.removeCategory(tag)
    }
</script>

<div class="paper grid gap-2.5 px-5 py-[18px]">
    <div class="flex flex-wrap items-end justify-between gap-3">
        <input
            class="editable-title hand-title min-w-0 flex-[1_1_300px] text-[50px]"
            bind:value={product.name}
            aria-label="Nombre del producto"
        />
        <div class="flex flex-wrap items-center gap-2.5 text-base">
            <input type="date" class="font-mono text-sm" bind:value={product.date} aria-label="Fecha" />
            <button class="button-soft {store.textMode ? 'bg-[#FFF4A8]!' : ''}" onclick={() => (store.textMode = true)}>Ver texto</button>
            <button class="button-soft" onclick={duplicate}>Clonar</button>
            {#if store.unsaved[store.selected]}<button class="button-soft" onclick={discard}>Descartar cambios</button>{/if}
            <button class="button-soft-danger" onclick={deleteProduct}>Borrar</button>
        </div>
    </div>
    <span class="font-mono text-xs text-muted">datos/{store.selected}</span>
    <label class="grid gap-1 font-bold">
        Descripción
        <textarea
            class="resize-y rounded border border-[#E6D77A] bg-[#FFFBE0] px-3 py-2 text-[17px] leading-normal font-normal"
            bind:value={product.description}
            rows="3"
            placeholder="Anotaciones para todo el documento: para quién es, qué se reaprovechó, qué falta por saber…"
        ></textarea>
    </label>
    <div class="grid gap-1.5">
        <span class="font-bold">Categorías de este documento</span>
        <div class="flex flex-wrap items-center gap-2">
            {#each product.categories as tag (tag)}
                {@const color = tagColor(tag, store.tags)}
                {@const usage = tagUsage(tag)}
                <span
                    class="inline-flex items-center gap-1.5 rounded-[3px] border py-0.5 pr-1 pl-2.5 text-[15px]"
                    style:background={softColor(color)}
                    style:border-color={color}
                    title="{usage.items.length} líneas"
                >
                    {tag}
                    <span class="font-mono text-xs text-muted">{formatEuros(usage.cost)}</span>
                    <button class="mini px-0.5" onclick={() => removeTag(tag)} aria-label="Quitar la categoría {tag}" title="Quitar categoría">
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

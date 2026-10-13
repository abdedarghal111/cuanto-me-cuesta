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
     * Pide el nombre de una categoría y la declara en el producto; un nombre vacío no declara nada.
     * @returns Promesa que se cumple al cerrar el diálogo.
     */
    async function addTag() {
        product.addCategory((await askName('Nueva categoría')) ?? '')
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
            class="editable-title min-w-0 flex-[1_1_300px] font-hand text-[50px] leading-none font-bold"
            bind:value={product.name}
            aria-label="Nombre del producto"
        />
        <div class="flex flex-wrap items-center gap-4 text-base">
            <input type="date" class="font-mono text-sm" bind:value={product.date} aria-label="Fecha" />
            <button class="link" class:font-bold={store.textMode} onclick={() => (store.textMode = true)}>ver texto</button>
            <button class="link" onclick={duplicate}>clonar</button>
            {#if store.unsaved[store.selected]}<button class="link" onclick={discard}>descartar cambios</button>{/if}
            <button class="link text-bad" onclick={deleteProduct}>borrar</button>
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
            {:else}
                <span class="text-muted">Ninguna todavía.</span>
            {/each}
            <button class="link text-[15px]" onclick={addTag}>+ añadir categoría</button>
        </div>
    </div>
</div>

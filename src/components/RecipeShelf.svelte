<!--
    @component
    Estante «Recetas» del producto abierto: un botón por receta, que la abre o la cierra (puede haber varias
    abiertas), y un hueco para escribir el nombre de una receta nueva.
-->

<script lang="ts">
    import type { SvelteSet } from 'svelte/reactivity'
    import type { CostSheet } from '../model/CostSheet.ts'
    import { Section } from '../model/Section.ts'

    /** `open` lleva las recetas abiertas; el estante lo cambia al pulsar. */
    let { product, open }: { product: CostSheet; open: SvelteSet<Section> } = $props()

    /**
     * Abre una receta cerrada o cierra una abierta.
     * @param recipe Receta del producto.
     */
    function toggle(recipe: Section) {
        if (open.has(recipe)) {
            open.delete(recipe)
        } else {
            open.add(recipe)
        }
    }

    /**
     * Crea una receta con el nombre escrito, la abre y vacía el hueco.
     * @param input Hueco «Nueva receta…».
     */
    function addRecipe(input: HTMLInputElement) {
        const title = input.value.trim()
        input.value = ''
        if (!title) {
            return
        }
        product.addSection(Section.blankFunction(title))
        open.add(product.functions.at(-1)!)
    }
</script>

<h2 class="hand-title text-[34px] text-recipe-ink">Recetas</h2>
<div class="flex flex-wrap items-center gap-3">
    {#each product.functions as recipe (recipe)}
        {@const isOpen = open.has(recipe)}
        <button class="recipe-button {isOpen ? 'bg-recipe text-white' : 'bg-recipe-soft text-recipe-ink'}" onclick={() => toggle(recipe)} aria-pressed={isOpen}>
            <span class="hand-title text-[24px]">{recipe.title}</span>
            {#if recipe.params.length}<span class="font-mono text-xs opacity-80">{recipe.params.join(' · ')}</span>{/if}
        </button>
    {/each}
    <input
        class="recipe-ghost"
        placeholder="Nueva receta…"
        onchange={(e) => addRecipe(e.currentTarget)}
        onkeydown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        aria-label="Nueva receta"
    />
</div>

<style lang="postcss">
    @reference '../app.css';

    /* Botón de una receta del estante, con su nombre y sus datos. */
    .recipe-button {
        @apply flex cursor-pointer items-center gap-2 rounded-md border-2 border-recipe px-3 py-1.5 text-left shadow-[3px_3px_0_var(--recipe)];
    }
    /* Hueco para escribir el nombre de una receta nueva. */
    .recipe-ghost {
        @apply w-48 rounded-md border-2 border-dashed border-recipe bg-white/70 px-3 py-1.5 font-notebook italic placeholder:text-[#9AA9B8];
    }
</style>

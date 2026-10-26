<!--
    @component
    Vista de un producto (URL `/product/<archivo>`): ficha, recetas, secciones y «Sobre el total», o el texto del
    archivo, con el resumen al lado.
-->

<script lang="ts">
    import AmountCard from '../../components/AmountCard.svelte'
    import FileTextView from '../../components/FileTextView.svelte'
    import { SvelteSet } from 'svelte/reactivity'
    import ProductHeader from '../../components/ProductHeader.svelte'
    import RecipeShelf from '../../components/RecipeShelf.svelte'
    import SectionEditor from '../../components/SectionEditor.svelte'
    import TagRanking from '../../components/TagRanking.svelte'
    import TotalSurcharges from '../../components/TotalSurcharges.svelte'
    import { tagSegments } from '../../colors.ts'
    import type { CostSheet } from '../../model/CostSheet.ts'
    import { Section } from '../../model/Section.ts'
    import type { Summary } from '../../model/Summary.ts'
    import { formatEuros } from '../../model/text/numbers.ts'
    import { store } from '../../store.client.svelte.ts'

    let { product, summary }: { product: CostSheet; summary: Summary } = $props()

    /** Recetas abiertas en el estante. */
    const open = new SvelteSet<Section>()

    /** Añade una sección en blanco o una copia de la de la plantilla elegida (valor: índice de la sección). */
    function addSection(e: Event & { currentTarget: HTMLSelectElement }) {
        const value = e.currentTarget.value
        e.currentTarget.value = ''
        const templateSection = store.template.sections[Number(value)]
        if (value === 'empty' || !templateSection) {
            product.addSection(Section.blank('Nueva sección'))
        } else {
            product.addSection(templateSection.clone())
        }
    }
</script>

<section class="flex min-w-0 flex-[999_1_680px] flex-col gap-[18px]">
    <ProductHeader {product} />

    {#if store.textMode}
        <FileTextView {product} />
    {:else}
        <RecipeShelf {product} {open} />
        {#each product.functions as section (section)}
            {#if open.has(section)}
                <SectionEditor {product} {section} />
            {/if}
        {/each}

        <h2 class="hand-title mt-2 text-[34px]">Secciones</h2>
        {#each product.groups as section (section)}
            <SectionEditor {product} {section} />
        {/each}

        <select class="add-section self-start" onchange={addSection} aria-label="Nueva sección">
            <option value="" selected disabled>+ nueva sección…</option>
            <option value="empty">Sección en blanco</option>
            {#each store.template.sections as templateSection, i (i)}
                {#if !templateSection.isFunction}<option value={i}>{templateSection.title}</option>{/if}
            {/each}
        </select>

        <TotalSurcharges {product} {summary} />

        <p class="paper-soft">
            Coste = precio de una unidad × cantidad. Solo números con coma (<code>0,5</code>). El tipo dice cómo se escribe el precio: fijo (<code>6,5 €</code>), lote (lo que costó y lo que trae: <code>4,2 € por 20 ud</code>), horas (<code>12 €/h</code>) o luz (<code>140 W a 0,20 €/kWh</code>). En horas, en luz y en un lote por d, h o min, la cantidad es una duración: <code>3d 5h 1m 3s</code>.
            Una receta no suma por sí sola: sus líneas usan sus datos como cantidad, y una línea que la elige como tipo rellena esos datos y cuesta lo que la receta, por su cantidad.
            Los recargos de una sección son un % de la suma de sus líneas y se suman entre sí; los de «Sobre el total» se aplican en orden, cada uno sobre lo acumulado.
            Las secciones de «+ nueva sección» y las de un producto nuevo salen de la plantilla, <code>src/res/template.txt</code>.
        </p>
    {/if}
</section>

<aside class="sticky top-[90px] flex flex-[1_1_300px] flex-col gap-[18px] max-w-[360px]">
    <AmountCard label="Me ha costado" amount={summary.cost}>
        {#if summary.total !== summary.cost}<span class="font-bold">Con lo de sobre el total: {formatEuros(summary.total)}</span>{/if}
        {#if summary.excluded > 0}<span class="text-sm">+ {formatEuros(summary.excluded)} que no cuentan</span>{/if}
    </AmountCard>
    <TagRanking segments={tagSegments(summary.byCategory, store.tags)} total={summary.total} />
    <div class="panel">
        <h2 class="panel-title">Por secciones</h2>
        {#each product.groups as section (section)}
            <div class="panel-row flex justify-between gap-2">
                <span class="truncate">{section.title}</span><span class="font-mono text-sm font-semibold">{formatEuros(section.subtotal())}</span>
            </div>
        {/each}
    </div>
</aside>

<style lang="postcss">
    @reference '../../app.css';

    /* Desplegable «+ nueva sección…»: un recuadro discontinuo en azul con letra a mano. */
    .add-section {
        @apply rounded-md border-2 border-dashed border-accent bg-white px-4 py-2 font-hand text-[26px] font-bold text-accent;
    }
</style>

<!--
    @component
    Vista de un producto (URL `/product/<archivo>`): ficha, bloques y «Sobre el total», o el texto del archivo,
    con el resumen al lado.
-->

<script lang="ts">
    import AmountCard from '../../components/AmountCard.svelte'
    import FileTextView from '../../components/FileTextView.svelte'
    import ProductHeader from '../../components/ProductHeader.svelte'
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

    /** Añade un bloque en blanco o una copia del de la plantilla elegido (valor: índice del bloque). */
    function addSection(e: Event & { currentTarget: HTMLSelectElement }) {
        const value = e.currentTarget.value
        e.currentTarget.value = ''
        const templateSection = store.template.sections[Number(value)]
        if (value === 'function') {
            product.addSection(Section.blankFunction('Nueva función'))
        } else if (value === 'empty' || !templateSection) {
            product.addSection(Section.blank('Nuevo bloque'))
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
        {#each product.sections as section, index (section)}
            <SectionEditor {product} {section} {index} />
        {/each}

        <select class="add-block self-start" onchange={addSection} aria-label="Nuevo bloque">
            <option value="" selected disabled>+ nuevo bloque…</option>
            <option value="empty">Bloque en blanco</option>
            <option value="function">Grupo función en blanco</option>
            {#each store.template.sections as templateSection, i (i)}
                <option value={i}>{templateSection.isFunction ? 'ƒ ' : ''}{templateSection.title}</option>
            {/each}
        </select>

        <TotalSurcharges {product} {summary} />

        <p class="paper-soft">
            Coste = precio de una unidad × cantidad. Solo números con coma (<code>0,5</code>). El tipo dice cómo se escribe el precio: común (<code>6,5 €</code>), lote (lo que costó y lo que trae: <code>4,2 € por 20 ud</code>), horas (<code>12 €/h</code>) o luz (<code>140 W a 0,20 €/kWh</code>). En horas, en luz y en un lote por d, h o min, la cantidad es una duración: <code>3d 5h 1m 3s</code>.
            Un grupo función (ƒ) no suma por sí solo: sus líneas usan sus datos como cantidad, y una línea que lo elige como tipo rellena esos datos y cuesta lo que el grupo, por su cantidad.
            Los recargos de un bloque son un % de la suma de sus líneas y se suman entre sí; los de «Sobre el total» se aplican en orden, cada uno sobre lo acumulado.
            Los bloques de «+ nuevo bloque» y los de un producto nuevo salen de la plantilla, <code>src/res/template.txt</code>.
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
        <h2 class="panel-title">Por bloques</h2>
        {#each product.groups as section (section)}
            <div class="panel-row flex justify-between gap-2">
                <span class="truncate">{section.title}</span><span class="font-mono text-sm font-semibold">{formatEuros(section.subtotal())}</span>
            </div>
        {/each}
    </div>
</aside>

<style lang="postcss">
    @reference '../../app.css';

    /* Desplegable «+ nuevo bloque…»: un recuadro discontinuo en azul con letra a mano. */
    .add-block {
        @apply rounded-md border-2 border-dashed border-accent bg-white px-4 py-2 font-hand text-[26px] font-bold text-accent;
    }
</style>

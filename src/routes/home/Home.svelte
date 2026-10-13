<!--
    @component
    Portada «Todo» (URL `/`): el gasto de todos los productos por categoría y por producto,
    con lo que llevo gastado al lado.
-->

<script lang="ts">
    import AmountCard from '../../components/AmountCard.svelte'
    import TagBar from '../../components/TagBar.svelte'
    import TagRanking from '../../components/TagRanking.svelte'
    import { tagSegments } from '../../colors.ts'
    import { Summary } from '../../model/Summary.ts'
    import { formatEuros } from '../../model/text/numbers.ts'
    import { store } from '../../store.client.svelte.ts'

    const summaries = $derived(Object.fromEntries(Object.entries(store.products).map(([file, product]) => [file, product.summarize()])))
    const maxTotal = $derived(Math.max(0, ...Object.values(summaries).map((s) => s.total)))
    const combined = $derived(Summary.combine(Object.values(summaries)))
</script>

<section class="flex min-w-0 flex-[999_1_600px] flex-col gap-4">
    <h1 class="paper px-5 py-3 font-hand text-[54px] leading-none font-bold">¿En qué se me va el dinero?</h1>
    {#if store.files.length === 0}
        <p class="paper p-4">Todavía no hay nada. Dale a «+ nuevo» para empezar.</p>
    {:else}
        <TagRanking segments={tagSegments(combined.byCategory, store.tags)} total={combined.total} />
        <h2 class="paper-soft font-hand text-[34px] leading-none font-bold text-[#183F86]">Por producto</h2>
        {#each store.files as file (file)}
            {@const product = store.products[file]}
            {@const summary = summaries[file]}
            {#if product && summary}
                <button class="paper grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1.5 px-4 py-3 text-left hover:bg-[#FFFBE0]" onclick={() => store.select(file)}>
                    <span class="truncate font-bold">
                        {product.name} <span class="text-[15px] font-normal text-muted">{product.date}</span>
                    </span>
                    <span class="font-mono font-semibold">{formatEuros(summary.total)}</span>
                    <span class="col-span-2"><TagBar segments={tagSegments(summary.byCategory, store.tags)} scale={maxTotal} height={12} /></span>
                </button>
            {/if}
        {/each}
    {/if}
</section>
<aside class="flex flex-[1_1_280px] flex-col gap-[18px] max-w-[340px]">
    <AmountCard label="Llevo gastado" amount={combined.cost}>
        <span>en {store.files.length} {store.files.length === 1 ? 'producto' : 'productos'}</span>
    </AmountCard>
</aside>

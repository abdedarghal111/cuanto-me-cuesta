<!--
    @component
    Aplicación: barra de pestañas y diálogo, y la vista de la URL: un producto (`/product/<archivo>`, en
    `routes/product/`) o la portada «Todo» (`/`), con el gasto de todos los productos por categoría y por producto.
    Los datos viven en `store`.
-->

<script lang="ts">
    import Dialog from './components/Dialog.svelte'
    import TabBar from './components/TabBar.svelte'
    import TagBar from './components/TagBar.svelte'
    import TagRanking from './components/TagRanking.svelte'
    import { tagSegments } from './colors.ts'
    import { formatEuros } from './model/text/numbers.ts'
    import Product from './routes/product/Product.svelte'
    import { store } from './store.client.svelte.ts'

    const summaries = $derived(Object.fromEntries(Object.entries(store.products).map(([file, product]) => [file, product.summarize()])))
    const maxTotal = $derived(Math.max(0, ...Object.values(summaries).map((s) => s.total)))
    const combined = $derived.by(() => {
        const byTag = new Map<string, number>()
        let total = 0
        let cost = 0
        for (const summary of Object.values(summaries)) {
            total += summary.total
            cost += summary.cost
            for (const [tag, amount] of summary.byCategory) {
                byTag.set(tag, (byTag.get(tag) ?? 0) + amount)
            }
        }
        return { total, cost, segments: tagSegments(byTag, store.tags) }
    })
</script>

<Dialog />
<TabBar />

<main class="mx-auto flex max-w-[1500px] flex-wrap items-start gap-6 p-6">
    {#if store.product && store.summary}
        <Product product={store.product} summary={store.summary} />
    {:else}
        <section class="flex min-w-0 flex-[999_1_600px] flex-col gap-4">
            <h1 class="paper px-5 py-3 font-hand text-[54px] leading-none font-bold">¿En qué se me va el dinero?</h1>
            {#if store.files.length === 0}
                <p class="paper p-4">Todavía no hay nada. Dale a «+ nuevo» para empezar.</p>
            {:else}
                <TagRanking segments={combined.segments} total={combined.total} />
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
            <div class="note-card">
                <span class="font-hand text-[26px] font-bold">Llevo gastado</span>
                <span class="font-hand text-[72px] leading-none font-bold text-[#B4161D]">{formatEuros(combined.cost)}</span>
                <span>en {store.files.length} {store.files.length === 1 ? 'producto' : 'productos'}</span>
            </div>
        </aside>
    {/if}
</main>

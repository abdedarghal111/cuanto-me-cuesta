<!--
    @component
    Portada «Todo» (URL `#/`): el gasto de todas las hojas por categoría y por producto, con lo que llevo gastado al
    lado. Las cuentas llegan hechas del proceso principal.
-->

<script lang="ts">
    import AmountCard from '../../components/AmountCard.svelte'
    import TagBar from '../../components/TagBar.svelte'
    import TagRanking from '../../components/TagRanking.svelte'
    import { tagSegments } from '../../colors.ts'
    import { formatEuros } from '../../model/text/numbers.ts'
    import { store } from '../../store.client.svelte.ts'

    const maxTotal = $derived(Math.max(0, ...Object.values(store.views).map((view) => view.total)))
</script>

<section class="flex min-w-0 flex-[999_1_600px] flex-col gap-4">
    <h1 class="paper px-5 py-3 hand-title text-[54px]">¿En qué se me va el dinero?</h1>
    {#if store.documents.length === 0}
        <p class="paper p-4">Todavía no hay nada. Dale a «+ nuevo» para empezar, o abre una hoja con «Abrir…» o arrastrándola aquí.</p>
    {:else}
        <TagRanking segments={tagSegments(store.overview.byCategory, store.tags)} total={store.overview.total} />
        <h2 class="paper-soft hand-title text-[34px] text-[#183F86]">Por producto</h2>
        {#each store.documents as doc (doc.id)}
            {@const view = store.views[doc.id]}
            {#if view}
                <button class="paper grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1.5 px-4 py-3 text-left hover:bg-[#FFFBE0]" onclick={() => store.select(doc.id)}>
                    <span class="truncate font-bold">
                        {view.name} <span class="text-[15px] font-normal text-muted">{view.date}</span>
                    </span>
                    <span class="font-mono font-semibold">{formatEuros(view.total)}</span>
                    <span class="col-span-2"><TagBar segments={tagSegments(view.byCategory, store.tags)} scale={maxTotal} height={12} /></span>
                </button>
            {/if}
        {/each}
    {/if}
</section>
<aside class="flex flex-[1_1_280px] flex-col gap-[18px] max-w-[340px]">
    <AmountCard label="Llevo gastado" amount={store.overview.cost}>
        <span>en {store.documents.length} {store.documents.length === 1 ? 'producto' : 'productos'}</span>
    </AmountCard>
</aside>

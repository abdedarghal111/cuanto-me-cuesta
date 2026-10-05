<!--
    @component
    Vista «Todo»: el gasto de todos los productos junto, por categoría y por producto.
-->

<script lang="ts">
    import { documentos } from './documentos.client.svelte.ts'
    import Barra from './Barra.svelte'
    import { segmentos } from './colores.ts'
    import DondeSeVa from './DondeSeVa.svelte'
    import { euros, resumir } from './formato.ts'

    const resumenes = $derived(Object.fromEntries(Object.entries(documentos.docs).map(([n, d]) => [n, resumir(d)])))
    const maxTotal = $derived(Math.max(0, ...Object.values(resumenes).map((r) => r.total)))
    const todoJunto = $derived.by(() => {
        const porTag = new Map<string, number>()
        let total = 0
        let coste = 0
        for (const r of Object.values(resumenes)) {
            total += r.total
            coste += r.coste
            for (const [t, c] of r.porTag) {
                porTag.set(t, (porTag.get(t) ?? 0) + c)
            }
        }
        return { total, coste, segmentos: segmentos(porTag, documentos.tags) }
    })
</script>

<section class="flex min-w-0 flex-[999_1_600px] flex-col gap-4">
    <h1 class="papel px-5 py-3 font-mano text-[54px] leading-none font-bold">¿En qué se me va el dinero?</h1>
    {#if documentos.archivos.length === 0}
        <p class="papel p-4">Todavía no hay nada. Dale a «+ nuevo» para empezar.</p>
    {:else}
        <DondeSeVa segmentos={todoJunto.segmentos} total={todoJunto.total} />
        <h2 class="papel-suave font-mano text-[34px] leading-none font-bold text-[#183F86]">Por producto</h2>
        {#each documentos.archivos as nombre (nombre)}
            {@const d = documentos.docs[nombre]}
            {@const r = resumenes[nombre]}
            {#if d && r}
                <button class="papel grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1.5 px-4 py-3 text-left hover:bg-[#FFFBE0]" onclick={() => documentos.elegir(nombre)}>
                    <span class="truncate font-bold">
                        {d.producto} <span class="text-[15px] font-normal text-muted">{d.fecha}</span>
                    </span>
                    <span class="font-mono font-semibold">{euros(r.total)}</span>
                    <span class="col-span-2"><Barra segmentos={segmentos(r.porTag, documentos.tags)} escala={maxTotal} alto={12} /></span>
                </button>
            {/if}
        {/each}
    {/if}
</section>
<aside class="flex flex-[1_1_280px] flex-col gap-[18px] max-w-[340px]">
    <div class="postit">
        <span class="font-mano text-[26px] font-bold">Llevo gastado</span>
        <span class="font-mano text-[72px] leading-none font-bold text-[#B4161D]">{euros(todoJunto.coste)}</span>
        <span>en {documentos.archivos.length} {documentos.archivos.length === 1 ? 'producto' : 'productos'}</span>
    </div>
</aside>

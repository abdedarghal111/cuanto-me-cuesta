<!--
    @component
    Ranking «¿Dónde se va?»: el gasto por categoría de mayor a menor, con barras de bloques en su color.
-->

<script lang="ts">
    import type { Segmento } from './colores.ts'
    import { euros } from './formato.ts'

    let { segmentos, total }: { segmentos: Segmento[]; total: number } = $props()

    /** Segmentos de mayor a menor importe, con una barra de bloques proporcional. */
    const ranking = $derived.by(() => {
        const max = Math.max(0, ...segmentos.map((s) => s.valor))
        return [...segmentos]
            .sort((a, b) => b.valor - a.valor)
            .map((s) => ({ ...s, barra: '█'.repeat(max > 0 ? Math.max(1, Math.round((s.valor / max) * 16)) : 0) }))
    })
</script>

<div class="papel grid gap-1 p-4 font-mono text-sm">
    <h2 class="mb-1 font-mano text-[26px] leading-none">¿Dónde se va?</h2>
    {#each ranking as s (s.etiqueta)}
        <div class="grid grid-cols-[minmax(0,7rem)_1fr_4.8rem] items-center gap-2 border-b border-[#EEF2F6] py-0.5">
            <span class="truncate">{s.etiqueta}</span>
            <span class="overflow-hidden tracking-[-1px] whitespace-pre" style:color={s.color}>{s.barra}</span>
            <span class="text-right font-semibold">{euros(s.valor)}</span>
        </div>
    {:else}
        <p class="font-cuaderno text-muted">Aún no hay gastos.</p>
    {/each}
    {#if segmentos.length}
        <div class="mt-2 flex justify-between border-t-2 border-ink pt-1.5 font-semibold">
            <span>Total</span><span>{euros(total)}</span>
        </div>
    {/if}
</div>

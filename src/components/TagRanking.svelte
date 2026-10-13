<!--
    @component
    Ranking «¿Dónde se va?»: el gasto por categoría de mayor a menor, con barras de bloques en su color.
-->

<script lang="ts">
    import type { Segment } from '../colors.ts'
    import { formatEuros } from '../model/text/numbers.ts'

    let { segments, total }: { segments: Segment[]; total: number } = $props()

    /** Segmentos de mayor a menor importe, con una barra de bloques proporcional. */
    const ranking = $derived.by(() => {
        const max = Math.max(0, ...segments.map((s) => s.value))
        return [...segments]
            .sort((a, b) => b.value - a.value)
            .map((s) => ({ ...s, bar: '█'.repeat(max > 0 ? Math.max(1, Math.round((s.value / max) * 16)) : 0) }))
    })
</script>

<div class="paper grid gap-1 p-4 font-mono text-sm">
    <h2 class="mb-1 font-hand text-[26px] leading-none">¿Dónde se va?</h2>
    {#each ranking as s (s.label)}
        <div class="grid grid-cols-[minmax(0,7rem)_1fr_4.8rem] items-center gap-2 border-b border-[#EEF2F6] py-0.5">
            <span class="truncate">{s.label}</span>
            <span class="overflow-hidden tracking-[-1px] whitespace-pre" style:color={s.color}>{s.bar}</span>
            <span class="text-right font-semibold">{formatEuros(s.value)}</span>
        </div>
    {:else}
        <p class="font-notebook text-muted">Aún no hay gastos.</p>
    {/each}
    {#if segments.length}
        <div class="mt-2 flex justify-between border-t-2 border-ink pt-1.5 font-semibold">
            <span>Total</span><span>{formatEuros(total)}</span>
        </div>
    {/if}
</div>

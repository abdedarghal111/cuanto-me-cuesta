<!--
    @component
    Barra horizontal apilada con un segmento de color por categoría. `scale` es el valor que
    ocupa todo el ancho, para comparar varias barras entre sí.
-->

<script lang="ts">
    import type { Segment } from './colores.ts'
    import { formatEuros } from './formato.ts'

    let {
        segments,
        scale,
        height = 28,
    }: {
        segments: Segment[]
        scale?: number
        height?: number
    } = $props()

    const total = $derived(segments.reduce((sum, s) => sum + s.value, 0))
    const fullWidth = $derived(scale ?? total)
</script>

<div
    class="flex w-full gap-0.5 overflow-hidden rounded-sm bg-[#EEF2F6]"
    style:height="{height}px"
    role="img"
    aria-label={segments.map((s) => `${s.label} ${formatEuros(s.value)}`).join(', ')}
>
    {#if fullWidth > 0}
        {#each segments.filter((s) => s.value > 0) as s (s.label)}
            <div
                class="min-w-[3px] transition-[width] motion-reduce:transition-none"
                style:width="{(s.value / fullWidth) * 100}%"
                style:background={s.color}
                title="{s.label}: {formatEuros(s.value)}"
            ></div>
        {/each}
    {/if}
</div>

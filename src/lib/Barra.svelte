<!--
    @component
    Barra horizontal apilada con un segmento de color por categoría. `escala` es el valor que
    ocupa todo el ancho, para comparar varias barras entre sí.
-->

<script lang="ts">
    import { euros } from './formato'

    let {
        segmentos,
        escala,
        alto = 28,
    }: {
        segmentos: { etiqueta: string; valor: number; color: string }[]
        escala?: number
        alto?: number
    } = $props()

    const total = $derived(segmentos.reduce((s, x) => s + x.valor, 0))
    const base = $derived(escala ?? total)
</script>

<div
    class="flex w-full gap-0.5 overflow-hidden rounded-sm bg-[#EEF2F6]"
    style:height="{alto}px"
    role="img"
    aria-label={segmentos.map((s) => `${s.etiqueta} ${euros(s.valor)}`).join(', ')}
>
    {#if base > 0}
        {#each segmentos.filter((s) => s.valor > 0) as s (s.etiqueta)}
            <div
                class="min-w-[3px] transition-[width] motion-reduce:transition-none"
                style:width="{(s.valor / base) * 100}%"
                style:background={s.color}
                title="{s.etiqueta}: {euros(s.valor)}"
            ></div>
        {/each}
    {/if}
</div>

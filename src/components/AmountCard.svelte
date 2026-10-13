<!--
    @component
    Tarjeta pósit con la cifra importante: un título, el importe en grande y, debajo, las líneas que se le pasen.
-->

<script lang="ts">
    import type { Snippet } from 'svelte'
    import { formatEuros } from '../model/text/numbers.ts'

    let { label, amount, children }: { label: string; amount: number; children?: Snippet } = $props()
</script>

<div class="note-card">
    <span class="font-hand text-[26px] font-bold">{label}</span>
    <span class="hand-title text-[72px] text-[#B4161D]">{formatEuros(amount)}</span>
    {@render children?.()}
</div>

<style lang="postcss">
    @reference '../app.css';

    /* Tarjeta pósit con sombra dura, con su contenido en columna. */
    .note-card {
        @apply flex flex-col gap-0.5 border-2 border-ink bg-[#FFF4A8] px-5 py-4 shadow-[4px_4px_0_var(--ink)];
    }
</style>

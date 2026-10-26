<!--
    @component
    El producto abierto tal como queda en su archivo, para cambiarlo o pegar otro texto y cargarlo.
-->

<script lang="ts">
    import { untrack } from 'svelte'
    import { ask } from './Dialog.svelte'
    import type { CostSheet } from '../model/CostSheet.ts'
    import { store } from '../store.client.svelte.ts'

    let { product }: { product: CostSheet } = $props()

    // Se toma el texto al abrir; lo que se escriba después no cambia el producto hasta cargarlo.
    let text = $state(untrack(() => product.serialize().join('\n')))

    /** Carga el texto como el producto abierto; si no es válido, dice dónde falla y se queda como está. */
    async function load() {
        try {
            store.loadText(text)
        } catch (e) {
            await ask({ title: 'No se puede cargar', message: String(e), confirmLabel: 'Vale' })
        }
    }
</script>

<div class="paper grid gap-3 p-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="hand-title text-4xl">Así queda el archivo</h2>
        <div class="flex items-center gap-3">
            <button class="button-soft min-h-11" onclick={() => (store.textMode = false)}>Volver sin cargar</button>
            <button class="button-yellow" onclick={load}>Cargar este texto</button>
        </div>
    </div>
    <p class="text-muted">Puedes cambiarlo o pegar otro texto. Al cargarlo queda como cambio sin guardar.</p>
    <textarea class="min-h-[60vh] w-full font-mono text-[13px] leading-relaxed" bind:value={text} spellcheck="false" wrap="off"></textarea>
</div>

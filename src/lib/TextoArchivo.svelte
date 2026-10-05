<!--
    @component
    El producto abierto tal como queda en su archivo, para cambiarlo o pegar otro texto y cargarlo.
-->

<script lang="ts">
    import { untrack } from 'svelte'
    import { store } from './documentos.client.svelte.ts'
    import { productToText, type Product } from './formato.ts'

    let { product }: { product: Product } = $props()

    // Se toma el texto al abrir; lo que se escriba después no cambia el producto hasta cargarlo.
    let text = $state(untrack(() => productToText($state.snapshot(product))))
</script>

<div class="paper grid gap-3 p-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="font-hand text-4xl leading-none font-bold">Así queda el archivo</h2>
        <div class="flex items-center gap-3">
            <button class="link" onclick={() => (store.textMode = false)}>volver sin cargar</button>
            <button class="button-yellow" onclick={() => store.loadText(text)}>Cargar este texto</button>
        </div>
    </div>
    <p class="text-muted">Puedes cambiarlo o pegar otro texto. Al cargarlo queda como cambio sin guardar.</p>
    <textarea class="min-h-[60vh] w-full font-mono text-[13px] leading-relaxed" bind:value={text} spellcheck="false" wrap="off"></textarea>
</div>

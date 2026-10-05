<!--
    @component
    El producto abierto tal como queda en su archivo, para cambiarlo o pegar otro texto y cargarlo.
-->

<script lang="ts">
    import { untrack } from 'svelte'
    import { documentos } from './documentos.client.svelte.ts'
    import { aTexto, type Documento } from './formato.ts'

    let { doc }: { doc: Documento } = $props()

    // Se toma el texto al abrir; lo que se escriba después no cambia el producto hasta cargarlo.
    let texto = $state(untrack(() => aTexto($state.snapshot(doc))))
</script>

<div class="papel grid gap-3 p-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="font-mano text-4xl leading-none font-bold">Así queda el archivo</h2>
        <div class="flex items-center gap-3">
            <button class="enlace" onclick={() => (documentos.modoTexto = false)}>volver sin cargar</button>
            <button class="boton-amarillo" onclick={() => documentos.cargarTexto(texto)}>Cargar este texto</button>
        </div>
    </div>
    <p class="text-muted">Puedes cambiarlo o pegar otro texto. Al cargarlo queda como cambio sin guardar.</p>
    <textarea class="min-h-[60vh] w-full font-mono text-[13px] leading-relaxed" bind:value={texto} spellcheck="false" wrap="off"></textarea>
</div>

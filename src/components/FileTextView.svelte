<!--
    @component
    La hoja que se ve tal como queda en su archivo, para cambiarla o pegar otro texto y cargarlo.
-->

<script lang="ts">
    import { untrack } from 'svelte'
    import { api } from '../api.client.ts'
    import type { DocumentInfo } from '../ipc.ts'
    import { store } from '../store.client.svelte.ts'
    import { ask } from './Dialog.svelte'

    let { document: doc }: { document: DocumentInfo } = $props()

    // Se pide el texto al abrir; lo que se escriba después no cambia la hoja hasta cargarlo.
    let text = $state('')
    api.text(untrack(() => doc.id)).then((value) => (text = value))

    /** Carga el texto como la hoja; si no es válido, dice dónde falla y se queda como está. */
    async function load() {
        try {
            await api.loadText(doc.id, text)
            store.textMode = false
        } catch (e) {
            // Electron antepone el nombre de la orden al mensaje del error.
            const message = String(e).replace(/^Error: Error invoking remote method '[^']+': (\w*Error: )?/, '')
            await ask({ title: 'No se puede cargar', message, confirmLabel: 'Vale' })
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

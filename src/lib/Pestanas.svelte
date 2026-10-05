<!--
    @component
    Barra de arriba: una pestaña por producto más «Todo» y «+ nuevo», el aviso de cambios sin guardar
    y el botón Guardar.
-->

<script lang="ts">
    import { documentos } from './documentos.client.svelte.ts'
    import { preguntar } from './Dialogo.svelte'
    import Icono from './Icono.svelte'

    async function nuevo() {
        const producto = await preguntar({ titulo: 'Nuevo producto', mensaje: '¿Cómo se llama?', valor: '', aceptar: 'Crear' })
        if (producto) {
            documentos.crear(producto)
        }
    }
</script>

<header class="sticky top-0 z-10 border-b-2 border-ink bg-white px-4 py-2.5">
    <div class="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3">
        <nav class="flex flex-wrap gap-1.5">
            <button class="pestana" class:activa={documentos.sel === ''} onclick={() => documentos.elegir('')}>Todo</button>
            {#each documentos.archivos as nombre (nombre)}
                <button class="pestana" class:activa={documentos.sel === nombre} onclick={() => documentos.elegir(nombre)}>
                    {documentos.docs[nombre]?.producto ?? nombre}{#if documentos.sucios[nombre]}<span class="text-bad" title="Sin guardar"> ●</span>{/if}
                </button>
            {/each}
            <button class="pestana border-dashed text-muted" onclick={nuevo}>+ nuevo</button>
        </nav>
        <div class="flex flex-wrap items-center gap-3.5">
            {#if documentos.haySucios}
                <span class="font-bold text-bad">● Cambios sin guardar</span>
            {:else}
                <span class="text-sm text-muted">{documentos.estado}</span>
            {/if}
            <button class="guardar" onclick={() => documentos.guardarTodo()} disabled={!documentos.haySucios} title="Ctrl+S">
                <Icono nombre="guardar" tam={20} />
                Guardar <span class="font-mono text-xs font-normal opacity-80">Ctrl+S</span>
            </button>
        </div>
    </div>
</header>

<!--
    @component
    Barra de arriba: una pestaña por producto más «Todo» y «+ nuevo», el aviso de cambios sin guardar
    y el botón Guardar.
-->

<script lang="ts">
    import { askName } from './Dialog.svelte'
    import Icon from './Icon.svelte'
    import { store } from '../store.client.svelte.ts'

    async function createProduct() {
        const name = await askName('Nuevo producto')
        if (name) {
            store.create(name)
        }
    }
</script>

<header class="sticky top-0 z-10 border-b-2 border-ink bg-white px-4 py-2.5">
    <div class="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3">
        <nav class="flex flex-wrap gap-1.5">
            <button class="tab" class:active={store.selected === ''} onclick={() => store.select('')}>Todo</button>
            {#each store.files as file (file)}
                <button class="tab" class:active={store.selected === file} onclick={() => store.select(file)}>
                    {store.products[file]?.name ?? file}{#if store.unsaved[file]}<span class="text-bad" title="Sin guardar"> ●</span>{/if}
                </button>
            {/each}
            <button class="tab border-dashed text-muted" onclick={createProduct}>+ nuevo</button>
        </nav>
        <div class="flex flex-wrap items-center gap-3.5">
            {#if store.hasUnsaved}
                <span class="font-bold text-bad">● Cambios sin guardar</span>
            {:else}
                <span class="text-sm text-muted">{store.status}</span>
            {/if}
            <button class="save-button" onclick={() => store.saveAll()} disabled={!store.hasUnsaved} title="Ctrl+S">
                <Icon name="save" size={20} />
                Guardar <span class="font-mono text-xs font-normal opacity-80">Ctrl+S</span>
            </button>
        </div>
    </div>
</header>

<style lang="postcss">
    @reference '../app.css';

    /* Botón Guardar: oscuro y grande, con su icono. */
    .save-button {
        @apply inline-flex min-h-12 items-center gap-2.5 rounded-lg border-2 border-ink bg-ink px-5 text-lg font-bold text-white;
    }
</style>

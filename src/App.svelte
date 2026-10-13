<!--
    @component
    Aplicación: barra de pestañas y diálogo, y la vista de la URL: un producto (`/product/<archivo>`, en
    `routes/product/`) o la portada «Todo» (`/`, en `routes/home/`). Los datos viven en `store`.
-->

<script lang="ts">
    import Dialog from './components/Dialog.svelte'
    import TabBar from './components/TabBar.svelte'
    import Home from './routes/home/Home.svelte'
    import Product from './routes/product/Product.svelte'
    import { store } from './store.client.svelte.ts'
</script>

<Dialog />
<TabBar />

<main class="mx-auto flex max-w-[1500px] flex-wrap items-start gap-6 p-6">
    {#if store.product && store.summary}
        <Product product={store.product} summary={store.summary} />
    {:else}
        <Home />
    {/if}
</main>

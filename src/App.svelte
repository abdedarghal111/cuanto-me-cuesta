<!--
    @component
    Aplicación: barra de pestañas, diálogo y asistente de hoja nueva, el aviso de versión nueva y la vista de la URL: un
    producto (`#/product/<hoja>`, en `routes/product/`) o la portada «Todo» (`#/`, en `routes/home/`). Los datos
    viven en `store`.
-->

<script lang="ts">
    import Dialog from './components/Dialog.svelte'
    import NewSheetWizard from './components/NewSheetWizard.svelte'
    import TabBar from './components/TabBar.svelte'
    import UpdateNotice from './components/UpdateNotice.svelte'
    import Home from './routes/home/Home.svelte'
    import Product from './routes/product/Product.svelte'
    import { baseName, store } from './store.client.svelte.ts'

    // Título de la ventana, como en un editor: el archivo que se ve, con un punto si tiene cambios sin guardar.
    $effect(() => {
        const doc = store.document
        const file = doc ? (doc.path ? baseName(doc.path) : doc.name) : ''
        document.title = file ? `${doc?.dirty ? '● ' : ''}${file} — Cuánto me cuesta` : 'Cuánto me cuesta'
    })
</script>

<Dialog />
<NewSheetWizard />
<TabBar />

<main class="mx-auto flex max-w-[1500px] flex-wrap items-start gap-6 p-6">
    {#if store.update}
        <UpdateNotice version={store.update.version} url={store.update.url} />
    {/if}
    {#if store.document && store.view}
        <Product document={store.document} view={store.view} />
    {:else}
        <Home />
    {/if}
</main>

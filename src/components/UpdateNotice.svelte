<!--
    @component
    Aviso de que hay una versión nueva de la app publicada en GitHub, con un botón que abre su página para descargarla y otro que lo esconde hasta la próxima vez que se abra la app.
-->

<script lang="ts">
    import { api } from '../api.client.ts'
    import { store } from '../store.client.svelte.ts'

    let { version, url }: { version: string; url: string } = $props()
</script>

<div class="notice w-full" role="status">
    <span class="notice-icon" aria-hidden="true">↓</span>
    <div class="grid flex-[1_1_320px] gap-0.5">
        <b>Hay una versión nueva: {version}</b>
        <span class="text-[15px] text-muted">Está en GitHub, lista para descargar e instalar.</span>
    </div>
    <div class="flex flex-wrap items-center gap-3">
        <button class="button-soft" onclick={() => api.openRelease(url)}>Descargar</button>
        <!-- Solo lo esconde hasta que se vuelva a abrir la app. -->
        <button class="button-soft-danger" onclick={() => (store.update = null)}>Ahora no</button>
    </div>
</div>

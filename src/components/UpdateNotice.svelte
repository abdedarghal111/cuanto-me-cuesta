<!--
    @component
    Aviso de que hay una versión nueva de la app publicada en GitHub, con un botón que abre su página para descargarla.
-->

<script lang="ts">
    import { api } from '../api.client.ts'

    let { version, url }: { version: string; url: string } = $props()
</script>

<div class="notice w-full" role="status">
    <span class="notice-icon" aria-hidden="true">↓</span>
    <div class="grid flex-[1_1_320px] gap-0.5">
        <b>Hay una versión nueva: {version}</b>
        <span class="text-[15px] text-muted">Está en GitHub, lista para descargar e instalar.</span>
    </div>
    <button class="button-yellow" onclick={() => api.openRelease(url)}>Descargar</button>
</div>

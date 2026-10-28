<!--
    @component
    Aviso de que el archivo de la hoja ha cambiado fuera de la app: traer los cambios o dejar el archivo como estaba.
    Si no se pulsa nada, no pasa nada: la hoja sigue como está y el archivo, como lo dejaron.
-->

<script lang="ts">
    import { api } from '../api.client.ts'
    import type { DocumentInfo } from '../ipc.ts'

    let { document: doc }: { document: DocumentInfo } = $props()
</script>

<div class="notice" role="status">
    <span class="notice-icon" aria-hidden="true">↻</span>
    <div class="grid flex-[1_1_320px] gap-0.5">
        <b>Se han detectado cambios en esta hoja.</b>
        <span class="text-[15px] text-muted">
            ¿Los traigo? Si no eliges nada, todo sigue igual.
            {#if doc.dirty}Al traerlos se pierde lo que no has guardado.{/if}
        </span>
    </div>
    <div class="flex flex-wrap gap-2.5">
        <button class="button-yellow" onclick={() => api.acceptOutside(doc.id)}>Sí, traerlos</button>
        <button class="button-soft" onclick={() => api.restoreFile(doc.id)}>No, dejarla como estaba</button>
    </div>
</div>

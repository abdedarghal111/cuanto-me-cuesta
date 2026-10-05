<!--
    @component
    Botones de subir, bajar y quitar un elemento de una lista del producto abierto (una línea o un recargo).
    `mover` y `quitar` también se usan sueltos, por ejemplo con los bloques.
-->

<script lang="ts" module>
    import { documentos } from './documentos.client.svelte.ts'
    import { preguntar } from './Dialogo.svelte'

    /** Cambia el elemento `i` de sitio con el de al lado. */
    export function mover<T>(lista: T[], i: number, paso: -1 | 1) {
        const j = i + paso
        if (j < 0 || j >= lista.length) {
            return
        }
        ;[lista[i], lista[j]] = [lista[j], lista[i]]
        documentos.cambiado()
    }

    /** Quita el elemento `i`; con `pregunta`, antes pide confirmarlo. */
    export async function quitar<T>(lista: T[], i: number, pregunta?: string) {
        if (pregunta && !(await preguntar({ titulo: pregunta, aceptar: 'Quitar', peligro: true }))) {
            return
        }
        lista.splice(i, 1)
        documentos.cambiado()
    }
</script>

<script lang="ts">
    import Icono from './Icono.svelte'

    let { lista, i }: { lista: unknown[]; i: number } = $props()
</script>

<span class="inline-flex">
    <button class="mini px-0.5" onclick={() => mover(lista, i, -1)} title="Subir" aria-label="Subir"><Icono nombre="arriba" tam={16} /></button>
    <button class="mini px-0.5" onclick={() => mover(lista, i, 1)} title="Bajar" aria-label="Bajar"><Icono nombre="abajo" tam={16} /></button>
    <button class="mini px-0.5" onclick={() => quitar(lista, i)} title="Quitar" aria-label="Quitar"><Icono nombre="quitar" tam={16} /></button>
</span>

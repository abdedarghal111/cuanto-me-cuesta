<!--
    @component
    Diálogo modal de la app para confirmar acciones o pedir un texto, en lugar de `prompt`,
    `confirm` y `alert` del navegador. La app lo monta una vez y cualquier componente lo abre con
    `await preguntar({ … })`.
-->

<script lang="ts" module>
    /** Lo que muestra el diálogo. */
    export interface Opciones {
        titulo: string
        mensaje?: string
        /** Si se indica, muestra un campo de texto con este valor inicial. */
        valor?: string
        aceptar?: string
        /** Botón de aceptar en rojo, para acciones de borrar. */
        peligro?: boolean
    }

    /** Abre el diálogo montado; no existe hasta que se monta. */
    let abrir: ((opciones: Opciones) => Promise<string | null>) | undefined

    /** Abre el diálogo. Devuelve el texto escrito (con campo), `'si'` (sin campo) o `null` si se cancela. */
    export function preguntar(opciones: Opciones): Promise<string | null> {
        return abrir ? abrir(opciones) : Promise.resolve(null)
    }
</script>

<script lang="ts">
    let ventana: HTMLDialogElement
    let campo = $state<HTMLInputElement>()
    let op = $state<Opciones>({ titulo: '' })
    let texto = $state('')
    let responder: (r: string | null) => void = () => {}

    abrir = (opciones) => {
        op = opciones
        texto = opciones.valor ?? ''
        ventana.showModal()
        setTimeout(() => campo?.select())
        return new Promise((r) => (responder = r))
    }

    function cerrar(r: string | null) {
        responder(r)
        responder = () => {}
        ventana.close()
    }

    function enviar(e: SubmitEvent) {
        e.preventDefault()
        if (op.valor !== undefined && !texto.trim()) {
            return
        }
        cerrar(op.valor !== undefined ? texto.trim() : 'si')
    }
</script>

<dialog
    bind:this={ventana}
    onclose={() => cerrar(null)}
    class="papel m-auto w-[min(92vw,480px)] p-0 shadow-[6px_6px_0_var(--ink)] backdrop:bg-ink/40"
>
    <form class="grid gap-4 p-6" onsubmit={enviar}>
        <h2 class="font-mano text-[40px] leading-none font-bold">{op.titulo}</h2>
        {#if op.mensaje}<p class="whitespace-pre-line">{op.mensaje}</p>{/if}
        {#if op.valor !== undefined}
            <input bind:this={campo} bind:value={texto} class="sin-caja border-b-2 border-ink py-1 text-2xl" aria-label={op.titulo} />
        {/if}
        <div class="flex flex-wrap items-center justify-end gap-4">
            <button type="button" class="enlace" onclick={() => cerrar(null)}>cancelar</button>
            <button type="submit" class={op.peligro ? 'boton-peligro' : 'boton-amarillo'}>{op.aceptar ?? 'Aceptar'}</button>
        </div>
    </form>
</dialog>

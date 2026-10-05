<!--
    @component
    Diálogo modal de la app para confirmar acciones o pedir un texto, en lugar de `prompt`,
    `confirm` y `alert` del navegador. La app lo monta una vez y cualquier componente lo abre con
    `await ask({ … })`.
-->

<script lang="ts" module>
    /** Lo que muestra el diálogo. */
    export interface DialogOptions {
        title: string
        message?: string
        /** Si se indica, muestra un campo de texto con este valor inicial. */
        value?: string
        confirmLabel?: string
        /** Botón de aceptar en rojo, para acciones de borrar. */
        danger?: boolean
    }

    /** Abre el diálogo montado; no existe hasta que se monta. */
    let open: ((options: DialogOptions) => Promise<string | null>) | undefined

    /** Abre el diálogo. Devuelve el texto escrito (con campo), `'yes'` (sin campo) o `null` si se cancela. */
    export function ask(options: DialogOptions): Promise<string | null> {
        return open ? open(options) : Promise.resolve(null)
    }
</script>

<script lang="ts">
    let dialog: HTMLDialogElement
    let input = $state<HTMLInputElement>()
    let options = $state<DialogOptions>({ title: '' })
    let text = $state('')
    let resolve: (answer: string | null) => void = () => {}

    open = (newOptions) => {
        options = newOptions
        text = newOptions.value ?? ''
        dialog.showModal()
        setTimeout(() => input?.select())
        return new Promise((r) => (resolve = r))
    }

    function close(answer: string | null) {
        resolve(answer)
        resolve = () => {}
        dialog.close()
    }

    function submit(e: SubmitEvent) {
        e.preventDefault()
        if (options.value !== undefined && !text.trim()) {
            return
        }
        close(options.value !== undefined ? text.trim() : 'yes')
    }
</script>

<dialog
    bind:this={dialog}
    onclose={() => close(null)}
    class="paper m-auto w-[min(92vw,480px)] p-0 shadow-[6px_6px_0_var(--ink)] backdrop:bg-ink/40"
>
    <form class="grid gap-4 p-6" onsubmit={submit}>
        <h2 class="font-hand text-[40px] leading-none font-bold">{options.title}</h2>
        {#if options.message}<p class="whitespace-pre-line">{options.message}</p>{/if}
        {#if options.value !== undefined}
            <input bind:this={input} bind:value={text} class="borderless border-b-2 border-ink py-1 text-2xl" aria-label={options.title} />
        {/if}
        <div class="flex flex-wrap items-center justify-end gap-4">
            <button type="button" class="link" onclick={() => close(null)}>cancelar</button>
            <button type="submit" class={options.danger ? 'button-danger' : 'button-yellow'}>{options.confirmLabel ?? 'Aceptar'}</button>
        </div>
    </form>
</dialog>

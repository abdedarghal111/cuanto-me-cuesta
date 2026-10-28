<!--
    @component
    Asistente de hoja nueva, en un diálogo: primero el nombre, la fecha y cómo se empieza (en blanco, una
    plantilla de oficio o una copia de otra hoja); con una plantilla, después se marcan solo las líneas y los
    recargos que se van a usar. La app lo monta una vez y se abre con `openNewSheet()`.
-->

<script lang="ts" module>
    /** Abre el asistente montado; no existe hasta que se monta. */
    let open: (() => void) | undefined

    /** Abre el asistente de hoja nueva. */
    export function openNewSheet() {
        open?.()
    }
</script>

<script lang="ts">
    import { SvelteSet } from 'svelte/reactivity'
    import { api } from '../api.client.ts'
    import type { NewSheet, TemplateItem, TemplatePreview } from '../ipc.ts'
    import { store, today } from '../store.client.svelte.ts'

    let dialog: HTMLDialogElement
    let step = $state<1 | 2>(1)
    let name = $state('')
    let date = $state(today())
    /** Cómo se empieza: `'blank'`, `'copy'` o la posición de la plantilla elegida. */
    let start = $state<'blank' | 'copy' | number>('blank')
    /** Hoja que se copia, por identificador. */
    let copyId = $state('')
    /** Filas de la plantilla marcadas, por identificador. */
    const picked = new SvelteSet<string>()
    /** Lo que tendrá la hoja con lo marcado, según el proceso principal. */
    let preview = $state<TemplatePreview | null>(null)

    const template = $derived(typeof start === 'number' ? store.templates[start] : null)
    const items = $derived(template ? template.groups.flatMap((group) => group.items) : [])
    const canCreate = $derived(!!name.trim() && (start !== 'copy' || !!copyId))

    // Al cambiar lo marcado, se pide de nuevo lo que tendrá la hoja.
    $effect(() => {
        if (typeof start === 'number' && step === 2) {
            api.previewTemplate(start, [...picked]).then((value) => (preview = value))
        }
    })

    open = () => {
        step = 1
        name = ''
        date = today()
        start = 'blank'
        copyId = ''
        preview = null
        dialog.showModal()
    }

    /** Marca lo que la plantilla trae como más probable: las filas con «sí» en Cuenta. */
    function reset() {
        picked.clear()
        for (const item of items.filter((i) => i.counts)) {
            picked.add(item.id)
        }
    }

    /**
     * Marca o desmarca varias filas.
     * @param list Filas de la plantilla.
     * @param on Si se marcan.
     */
    function setAll(list: TemplateItem[], on: boolean) {
        for (const item of list) {
            if (on) {
                picked.add(item.id)
            } else {
                picked.delete(item.id)
            }
        }
    }

    /** Pasa al segundo paso con una plantilla, o crea la hoja en blanco o la copia. */
    function next() {
        if (template) {
            reset()
            step = 2
        } else {
            create()
        }
    }

    /** Crea la hoja elegida, la muestra y cierra el asistente. */
    async function create() {
        if (!canCreate) {
            return
        }
        const base = { name: name.trim(), date }
        const sheet: NewSheet =
            typeof start === 'number'
                ? { ...base, from: 'template', index: start, picked: [...picked] }
                : start === 'copy'
                  ? { ...base, from: 'copy', documentId: copyId }
                  : { ...base, from: 'blank' }
        dialog.close()
        store.select(await api.create(sheet))
    }
</script>

<dialog bind:this={dialog} class="paper m-auto max-h-[92vh] w-[min(94vw,880px)] p-0 shadow-[6px_6px_0_var(--ink)] backdrop:bg-ink/40">
    <form class="grid gap-4 p-6" onsubmit={(e) => (e.preventDefault(), step === 1 ? next() : create())}>
        <div class="flex flex-wrap items-center justify-between gap-3">
            <h2 class="hand-title text-[40px]">Nueva hoja</h2>
            <span class="flex items-center gap-2 font-mono text-sm text-muted">
                <span class="step {step === 1 ? 'step-active' : ''}">1 · Cómo empiezo</span>
                {#if template}<span>→</span><span class="step {step === 2 ? 'step-active' : ''}">2 · Qué voy a usar</span>{/if}
            </span>
        </div>

        {#if step === 1}
            <div class="flex flex-wrap items-end gap-4">
                <label class="grid min-w-60 flex-1 gap-1">
                    <span class="font-mono text-xs text-muted uppercase">Nombre</span>
                    <input class="borderless border-b-2 border-ink py-1 text-2xl" bind:value={name} placeholder="Ej. Estantería del salón" />
                </label>
                <label class="grid gap-1">
                    <span class="font-mono text-xs text-muted uppercase">Fecha</span>
                    <input type="date" class="font-mono text-sm" bind:value={date} />
                </label>
            </div>
            <div class="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
                <button type="button" class="start-card border-dashed {start === 'blank' ? 'start-active' : ''}" onclick={() => (start = 'blank')}>
                    <span class="hand-title text-[26px]">En blanco</span>
                    <span class="text-sm text-muted">Una hoja vacía, sin secciones ni categorías. Lo pones todo tú.</span>
                </button>
                {#each store.templates as sheet, i (sheet.name)}
                    <button type="button" class="start-card {start === i ? 'start-active' : ''}" onclick={() => (start = i)}>
                        <span class="hand-title text-[26px]">{sheet.name}</span>
                        <span class="text-sm text-muted">{sheet.description}</span>
                        <span class="font-mono text-xs text-accent">{sheet.groups.flatMap((g) => g.items).length} filas para elegir</span>
                    </button>
                {/each}
                {#if store.documents.length}
                    <div class="start-card {start === 'copy' ? 'start-active' : ''}">
                        <button type="button" class="grid gap-1 text-left" onclick={() => (start = 'copy')}>
                            <span class="hand-title text-[26px]">Copiar una hoja mía</span>
                            <span class="text-sm text-muted">Con todo lo que tenga, para un producto parecido.</span>
                        </button>
                        <select class="font-notebook text-sm" bind:value={copyId} onchange={() => (start = 'copy')} aria-label="Hoja que se copia">
                            <option value="" disabled>Elige una hoja…</option>
                            {#each store.documents as doc (doc.id)}<option value={doc.id}>{doc.name}</option>{/each}
                        </select>
                    </div>
                {/if}
            </div>
        {:else if template}
            <p>Marca solo lo que vas a usar en <b>{name}</b>. Lo que no marques no aparece en la hoja.</p>
            <div class="flex flex-wrap gap-2.5">
                <button type="button" class="button-soft text-sm" onclick={() => setAll(items, true)}>Marcar todo</button>
                <button type="button" class="button-soft text-sm" onclick={() => setAll(items, false)}>Desmarcar todo</button>
                <button type="button" class="button-soft text-sm" onclick={reset}>Restablecer</button>
            </div>
            <div class="grid gap-5 md:grid-cols-[1fr_220px]">
                <div class="grid content-start gap-3">
                    {#each template.groups as group (group)}
                        {@const marked = group.items.filter((item) => picked.has(item.id)).length}
                        <fieldset class="rounded-md border-2 p-3 pt-1 {group.recipe ? 'border-recipe bg-recipe-soft/40' : 'border-line'}">
                            <legend class="flex items-center gap-2 px-1">
                                <input
                                    type="checkbox"
                                    class="check"
                                    checked={marked === group.items.length}
                                    indeterminate={marked > 0 && marked < group.items.length}
                                    onchange={(e) => setAll(group.items, e.currentTarget.checked)}
                                    aria-label="Marcar todo «{group.title}»"
                                />
                                <span class="hand-title text-[24px] {group.recipe ? 'text-recipe-ink' : ''}">{group.recipe ? 'Receta · ' : ''}{group.title}</span>
                            </legend>
                            {#each group.items as item (item.id)}
                                <label class="flex items-center gap-2 py-0.5 {picked.has(item.id) ? '' : 'text-muted'}">
                                    <input type="checkbox" class="check" checked={picked.has(item.id)} onchange={() => setAll([item], !picked.has(item.id))} />
                                    <span class="flex-1">{item.name}</span>
                                    <span class="font-mono text-xs text-muted">{item.detail}</span>
                                </label>
                            {/each}
                        </fieldset>
                    {/each}
                </div>
                <div class="note-card self-start rounded-md border-2 border-ink bg-[#FFF4A8] p-4 md:sticky md:top-0">
                    <p class="hand-title text-[26px]">Tu hoja tendrá</p>
                    {#if preview}
                        <ul class="mt-2 grid gap-1">
                            <li>{preview.groups} secciones</li>
                            {#if preview.recipes}<li>{preview.recipes} recetas</li>{/if}
                            <li>{preview.lines} líneas</li>
                            <li>Categorías: {preview.categories.join(', ') || 'ninguna'}</li>
                        </ul>
                    {/if}
                    <p class="mt-3 text-sm text-muted">Las categorías salen solas de lo que marques.</p>
                </div>
            </div>
        {/if}

        <div class="flex flex-wrap items-center justify-between gap-4">
            {#if step === 2}<button type="button" class="button-soft min-h-11" onclick={() => (step = 1)}>← Atrás</button>{:else}<span></span>{/if}
            <span class="flex items-center gap-3">
                <button type="button" class="button-soft min-h-11" onclick={() => dialog.close()}>Cancelar</button>
                <button type="submit" class="button-yellow" disabled={!canCreate}>{step === 1 && template ? 'Siguiente →' : 'Crear hoja'}</button>
            </span>
        </div>
    </form>
</dialog>

<style lang="postcss">
    @reference '../app.css';

    /* Paso del asistente, como una pastilla; el actual, en amarillo. */
    .step {
        @apply rounded-full border-2 border-line px-2;
    }
    .step-active {
        @apply border-ink bg-[#FFF4A8] font-semibold text-ink;
    }
    /* Tarjeta de una forma de empezar; la elegida, en amarillo. */
    .start-card {
        @apply grid content-start gap-1 rounded-lg border-2 border-line bg-white p-3 text-left;
    }
    .start-active {
        @apply border-ink bg-[#FFF4A8];
    }
</style>

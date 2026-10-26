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
    import { CostSheet } from '../model/CostSheet.ts'
    import { Line } from '../model/Line.ts'
    import type { LineItem } from '../model/LineItem.ts'
    import type { Surcharge } from '../model/Surcharge.ts'
    import { store, today } from '../store.client.svelte.ts'

    /** Grupo de filas que se pueden marcar: una sección, una receta o «Sobre el total». */
    type Group = { title: string; recipe: boolean; items: LineItem[] }

    let dialog: HTMLDialogElement
    let step = $state<1 | 2>(1)
    let name = $state('')
    let date = $state(today())
    /** Cómo se empieza: `'blank'`, `'copy'` o la posición de la plantilla elegida. */
    let start = $state<'blank' | 'copy' | number>('blank')
    /** Hoja que se copia, por nombre de archivo. */
    let copyFile = $state('')
    /** Líneas y recargos de la plantilla marcados. */
    const picked = new SvelteSet<LineItem>()

    const template = $derived(typeof start === 'number' ? store.templates[start] : null)
    const groups = $derived(template ? groupsOf(template) : [])
    /** La hoja que saldría con lo marcado, para contar lo que tendrá. */
    const preview = $derived(template ? CostSheet.fromTemplate(template, name, date, (item) => picked.has(item)) : null)
    const canCreate = $derived(!!name.trim() && (start !== 'copy' || !!copyFile))

    open = () => {
        step = 1
        name = ''
        date = today()
        start = 'blank'
        copyFile = ''
        dialog.showModal()
    }

    /**
     * Grupos de filas de una plantilla, en su orden: sus secciones y recetas, y sus recargos sobre el total.
     * @param sheet Plantilla.
     * @returns Los grupos que tienen alguna fila.
     */
    function groupsOf(sheet: CostSheet): Group[] {
        return [
            ...sheet.sections.map((section) => ({ title: section.title, recipe: section.isFunction, items: [...section.lines, ...section.surcharges] })),
            { title: 'Sobre el total', recipe: false, items: sheet.totalSurcharges },
        ].filter((group) => group.items.length)
    }

    /**
     * Lo que se lee al lado de una fila: el tipo y el precio de una línea, o el % de un recargo.
     * @param item Línea o recargo de la plantilla.
     * @returns «lote · 19,99 € por 1000 g» o «recargo · 10 %».
     */
    function detail(item: LineItem): string {
        if (item instanceof Line) {
            const [, , type, price] = item.serialize()
            return `${type} · ${price}`
        }
        return `recargo · ${(item as Surcharge).percent} %`
    }

    /** Marca lo que la plantilla trae como más probable: las filas con «sí» en Cuenta. */
    function reset() {
        picked.clear()
        for (const item of groups.flatMap((group) => group.items)) {
            if (item.counts) {
                picked.add(item)
            }
        }
    }

    /**
     * Marca o desmarca varias filas.
     * @param items Filas de la plantilla.
     * @param on Si se marcan.
     */
    function setAll(items: LineItem[], on: boolean) {
        for (const item of items) {
            if (on) {
                picked.add(item)
            } else {
                picked.delete(item)
            }
        }
    }

    /**
     * Marca una fila desmarcada o desmarca una marcada.
     * @param item Fila de la plantilla.
     */
    function toggle(item: LineItem) {
        setAll([item], !picked.has(item))
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

    /** Crea la hoja elegida, la abre y cierra el asistente. */
    function create() {
        if (!canCreate) {
            return
        }
        if (template) {
            store.add(CostSheet.fromTemplate(template, name.trim(), date, (item) => picked.has(item)))
        } else {
            store.create(name.trim(), start === 'copy' ? store.products[copyFile] : undefined, date)
        }
        dialog.close()
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
                {#each store.templates as sheet, i (sheet)}
                    <button type="button" class="start-card {start === i ? 'start-active' : ''}" onclick={() => (start = i)}>
                        <span class="hand-title text-[26px]">{sheet.name}</span>
                        <span class="text-sm text-muted">{sheet.description}</span>
                        <span class="font-mono text-xs text-accent">{groupsOf(sheet).flatMap((g) => g.items).length} filas para elegir</span>
                    </button>
                {/each}
                {#if store.files.length}
                    <div class="start-card {start === 'copy' ? 'start-active' : ''}">
                        <button type="button" class="grid gap-1 text-left" onclick={() => (start = 'copy')}>
                            <span class="hand-title text-[26px]">Copiar una hoja mía</span>
                            <span class="text-sm text-muted">Con todo lo que tenga, para un producto parecido.</span>
                        </button>
                        <select class="font-notebook text-sm" bind:value={copyFile} onchange={() => (start = 'copy')} aria-label="Hoja que se copia">
                            <option value="" disabled>Elige una hoja…</option>
                            {#each store.files as file (file)}<option value={file}>{store.products[file]?.name ?? file}</option>{/each}
                        </select>
                    </div>
                {/if}
            </div>
        {:else if template && preview}
            <p>Marca solo lo que vas a usar en <b>{name}</b>. Lo que no marques no aparece en la hoja.</p>
            <div class="flex flex-wrap gap-4">
                <button type="button" class="link" onclick={() => setAll(groups.flatMap((g) => g.items), true)}>Marcar todo</button>
                <button type="button" class="link" onclick={() => setAll(groups.flatMap((g) => g.items), false)}>Desmarcar todo</button>
                <button type="button" class="link" onclick={reset}>Restablecer</button>
            </div>
            <div class="grid gap-5 md:grid-cols-[1fr_220px]">
                <div class="grid content-start gap-3">
                    {#each groups as group (group)}
                        {@const marked = group.items.filter((item) => picked.has(item)).length}
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
                            {#each group.items as item (item)}
                                <label class="flex items-center gap-2 py-0.5 {picked.has(item) ? '' : 'text-muted'}">
                                    <input type="checkbox" class="check" checked={picked.has(item)} onchange={() => toggle(item)} />
                                    <span class="flex-1">{item.name}</span>
                                    <span class="font-mono text-xs text-muted">{detail(item)}</span>
                                </label>
                            {/each}
                        </fieldset>
                    {/each}
                </div>
                <div class="note-card self-start rounded-md border-2 border-ink bg-[#FFF4A8] p-4 md:sticky md:top-0">
                    <p class="hand-title text-[26px]">Tu hoja tendrá</p>
                    <ul class="mt-2 grid gap-1">
                        <li>{preview.groups.length} secciones</li>
                        {#if preview.functions.length}<li>{preview.functions.length} recetas</li>{/if}
                        <li>{preview.sections.flatMap((s) => s.lines).length} líneas</li>
                        <li>Categorías: {preview.categories.join(', ') || 'ninguna'}</li>
                    </ul>
                    <p class="mt-3 text-sm text-muted">Las categorías salen solas de lo que marques.</p>
                </div>
            </div>
        {/if}

        <div class="flex flex-wrap items-center justify-between gap-4">
            {#if step === 2}<button type="button" class="link" onclick={() => (step = 1)}>← atrás</button>{:else}<span></span>{/if}
            <span class="flex items-center gap-4">
                <button type="button" class="link" onclick={() => dialog.close()}>cancelar</button>
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

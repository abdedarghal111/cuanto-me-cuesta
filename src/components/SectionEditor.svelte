<!--
    @component
    Una sección de la hoja que se ve: título editable con su subtotal y la tabla de sus líneas de gasto y de sus
    recargos sobre la sección. Si es una receta, va en marrón, sus filas no se activan ni se desactivan y lleva en vez
    del subtotal sus datos de entrada, que se arrastran a la Cantidad de sus líneas. Pinta la foto de la sección y
    manda cada cambio con `store.edit()`.
-->

<script lang="ts" module>
    import { LINE_TYPE_LABELS } from '../model/LineType.ts'
    import { Section } from '../model/Section.ts'

    /** Opciones básicas del desplegable «Tipo»: el valor de cada tipo y su nombre. */
    const LINE_TYPE_OPTIONS = Object.entries(LINE_TYPE_LABELS)
    /** Prefijo del valor de las opciones de «Tipo» que llaman a una receta, seguido de su identificador. */
    const FUNCTION_OPTION = 'ƒ'
    /** Tipo de los datos que se arrastran: el nombre de un dato de receta. */
    const PARAM_TYPE = 'application/x-recipe-param'

    /** Sitio donde se puede soltar una línea: delante de la fila `index` de la sección, o su fila fantasma. */
    type DropZone = { sectionId: string; recipe: boolean; index: number; ghost: boolean }
    /** Sitio de cada fila de todas las tarjetas, para saber cuál hay bajo el puntero. */
    const zones = new WeakMap<Element, DropZone>()

    /**
     * Arrastre de una línea, compartido por todas las tarjetas: la línea y su sección, dónde se soltaría y si se
     * clona (al soltarla en una fila fantasma).
     */
    const drag = $state<{ lineId: string | null; from: DropZone | null; to: string | null; index: number; clone: boolean }>({
        lineId: null,
        from: null,
        to: null,
        index: -1,
        clone: false,
    })

    /**
     * Registra una fila como sitio donde soltar una línea.
     * @param zone Su sección, su posición y si es la fila fantasma.
     * @returns El adjunto de la fila.
     */
    function dropZone(zone: DropZone) {
        return (row: Element) => {
            zones.set(row, zone)
            return () => zones.delete(row)
        }
    }
</script>

<script lang="ts">
    import type { BasicLineType } from '../model/LineType.ts'
    import type { SectionView, SheetView } from '../model/SheetView.ts'
    import type { EditField } from '../model/SheetEdit.ts'
    import { formatEuros, formatNumber } from '../model/text/numbers.ts'
    import { focusOnCreate, focusWhenCreated, liveValue } from '../fields.client.ts'
    import { store } from '../store.client.svelte.ts'
    import Icon from './Icon.svelte'
    import RowActions from './RowActions.svelte'
    import TagSelect from './TagSelect.svelte'

    /** `section` es una sección o una receta de `view`. */
    let {
        view,
        section,
        oncloned,
    }: {
        view: SheetView
        section: SectionView
        /** Se llama con el identificador de la copia al clonar la sección (p. ej. para abrir la receta copiada). */
        oncloned?: (copy: string) => void
    } = $props()

    /** Recetas a las que pueden llamar sus líneas; desde una receta, ninguna. */
    const recipes = $derived(section.isFunction ? [] : view.recipes)
    const categories = $derived(view.categories.map((c) => c.name))
    /** Columnas de la tabla: una receta no lleva la de «✓». */
    const columns = $derived(section.isFunction ? 7 : 8)

    /** Tarjeta de la sección, para saber si se toca fuera de ella. */
    let card: HTMLDivElement
    /** Si se ha tocado la tarjeta en una pantalla táctil: deja ver sus controles hasta que se toca fuera. */
    let touched = $state(false)
    /** Línea sobre cuya Cantidad se arrastra un dato, para resaltarla. */
    let dropTarget: string | null = $state(null)

    /**
     * Escribe un campo de un elemento de la sección.
     * @param id Identificador del elemento.
     * @param field Campo.
     * @param value Valor nuevo.
     */
    const set = (id: string, field: EditField, value: string | boolean) => store.edit({ op: 'set', id, field, value })

    /**
     * Crea una línea o un recargo con lo que se ha escrito en su fila fantasma, vacía la fila y pasa el foco al
     * concepto de la fila nueva para seguir escribiendo.
     * @param input Campo de la fila fantasma.
     * @param kind Qué se crea.
     */
    async function addFromGhost(input: HTMLInputElement, kind: 'line' | 'surcharge') {
        const name = input.value
        input.value = ''
        const created = await store.edit(
            kind === 'line' ? { op: 'addLine', sectionId: section.id, name } : { op: 'addSurcharge', sectionId: section.id, name },
        )
        focusWhenCreated(created)
    }

    /**
     * Empieza a arrastrar una línea desde su asa; el puntero queda capturado por el asa hasta soltarla.
     * @param e Evento de pulsar el asa.
     * @param lineId Línea que se arrastra.
     */
    function startDrag(e: PointerEvent & { currentTarget: HTMLElement }, lineId: string) {
        e.preventDefault()
        e.currentTarget.setPointerCapture(e.pointerId)
        drag.lineId = lineId
        drag.from = { sectionId: section.id, recipe: section.isFunction, index: 0, ghost: false }
    }

    /**
     * Busca la fila bajo el puntero y apunta dónde se soltaría la línea: delante o detrás de esa fila según la
     * mitad en la que esté, o en una fila fantasma para clonarla. Solo se mueve dentro de su sección o entre secciones
     * que no son recetas. Cerca de los bordes de la ventana, la desplaza.
     * @param e Evento de mover el puntero.
     */
    function moveDrag(e: PointerEvent) {
        if (!drag.lineId || !drag.from) {
            return
        }
        if (e.clientY < 60 || e.clientY > innerHeight - 60) {
            scrollBy(0, e.clientY < 60 ? -12 : 12)
        }
        const row = document.elementFromPoint(e.clientX, e.clientY)?.closest('tr')
        const zone = row && zones.get(row)
        const allowed = zone && (zone.sectionId === drag.from.sectionId || (!zone.recipe && !drag.from.recipe))
        if (!row || !zone || !allowed) {
            drag.to = null
            return
        }
        const { top, height } = row.getBoundingClientRect()
        drag.to = zone.sectionId
        drag.clone = zone.ghost
        drag.index = zone.index + (!zone.ghost && e.clientY > top + height / 2 ? 1 : 0)
    }

    /** Suelta la línea donde apunta el arrastre: la mueve, o añade una copia al final si es una fila fantasma. */
    function endDrag() {
        const { lineId, to, index, clone } = drag
        if (lineId && to) {
            store.edit({ op: 'moveLine', id: lineId, sectionId: to, index, copy: clone })
        }
        drag.lineId = null
        drag.to = null
    }

    /**
     * Cambia el tipo de una línea al elegido en el desplegable «Tipo»: uno básico o una receta.
     * @param id Línea de la sección.
     * @param value Valor de la opción elegida.
     */
    function setType(id: string, value: string) {
        if (value.startsWith(FUNCTION_OPTION)) {
            store.edit({ op: 'callRecipe', id, recipeId: value.slice(FUNCTION_OPTION.length) })
        } else {
            store.edit({ op: 'setType', id, type: value as BasicLineType })
        }
    }

    /**
     * Añade a la receta el dato escrito en su hueco y vacía el hueco.
     * @param input Hueco «dato…».
     */
    function addParam(input: HTMLInputElement) {
        store.edit({ op: 'addParam', sectionId: section.id, name: input.value })
        input.value = ''
    }

    /**
     * Cambia el nombre de un dato de la receta; si no se puede, el campo vuelve al nombre que quede.
     * @param param Nombre actual.
     * @param input Campo con el nombre nuevo.
     */
    async function renameParam(param: string, input: HTMLInputElement) {
        await store.edit({ op: 'renameParam', sectionId: section.id, from: param, to: input.value })
        input.value = section.params.includes(input.value.trim()) ? input.value.trim() : param
    }

    /**
     * Empieza a arrastrar un dato de la receta, con su pastilla entera como imagen.
     * @param e Evento de arrastre del asa de la pastilla.
     * @param param Nombre del dato.
     */
    function dragParam(e: DragEvent & { currentTarget: HTMLElement }, param: string) {
        e.dataTransfer?.setData(PARAM_TYPE, param)
        e.dataTransfer?.setDragImage(e.currentTarget.parentElement ?? e.currentTarget, 0, 0)
    }

    /**
     * Deja soltar un dato sobre la Cantidad de una línea y la resalta.
     * @param e Evento de arrastre sobre la celda.
     * @param id Línea de la celda.
     */
    function dragOver(e: DragEvent, id: string) {
        if (e.dataTransfer?.types.includes(PARAM_TYPE)) {
            e.preventDefault()
            dropTarget = id
        }
    }

    /**
     * Pone como Cantidad de una línea el dato que se suelta sobre ella.
     * @param e Evento de soltar sobre la celda.
     * @param id Línea de la celda.
     */
    function dropParam(e: DragEvent, id: string) {
        dropTarget = null
        const param = e.dataTransfer?.getData(PARAM_TYPE)
        if (param && section.params.includes(param)) {
            e.preventDefault()
            set(id, 'quantity', param)
        }
    }

    async function clone() {
        const copy = await store.edit({ op: 'clone', id: section.id })
        if (copy) {
            oncloned?.(copy)
        }
    }
</script>

{#snippet ghostCells(kind: 'line' | 'surcharge', placeholder: string, label: string)}
    <!-- Cada celda se pliega a alto 0 mientras la fila fantasma está oculta, para que no ocupe sitio. -->
    <td class="ghost-cell">
        <div class="ghost-fold"><div class="ghost-mark">+</div></div>
    </td>
    <td class="ghost-cell" colspan={columns - 1}>
        <div class="ghost-fold">
            <div class="px-1 py-1.5">
                <input class="ghost-input" {placeholder} oninput={(e) => addFromGhost(e.currentTarget, kind)} aria-label={label} />
            </div>
        </div>
    </td>
{/snippet}

<svelte:document onpointerdown={(e) => card.contains(e.target as Node) || (touched = false)} />

<div
    class="section-card overflow-hidden {section.isFunction ? 'recipe-card' : 'paper'} {touched || drag.lineId ? 'revealed' : ''}"
    bind:this={card}
    role="group"
    aria-label={section.title}
    onpointerdown={(e) => e.pointerType === 'touch' && (touched = true)}
>
    <div class={section.isFunction ? 'recipe-header' : 'card-header'}>
        <input
            class="editable-title block-title flex-1 {section.isFunction ? 'min-w-56 text-recipe-ink!' : 'min-w-0'}"
            {@attach liveValue(() => section.title)}
            oninput={(e) => set(section.id, 'title', e.currentTarget.value)}
            aria-label={section.isFunction ? 'Título de la receta' : 'Título de la sección'}
        />
        {#if section.isFunction}
            {#each section.params as param (param)}
                <span class="param inline-flex items-center gap-1 pr-1!">
                    <span
                        class="cursor-grab font-normal text-muted"
                        draggable="true"
                        ondragstart={(e) => dragParam(e, param)}
                        title="Arrástralo a una Cantidad"
                        aria-hidden="true">⠿</span
                    >
                    <input
                        class="borderless min-w-10 field-sizing-content font-mono text-[14px] font-semibold text-recipe-ink"
                        value={param}
                        onchange={(e) => renameParam(param, e.currentTarget)}
                        aria-label="Nombre del dato"
                    />
                    <button
                        class="mini px-0.5!"
                        onclick={() => store.edit({ op: 'removeParam', sectionId: section.id, param })}
                        aria-label="Quitar el dato «{param}»">×</button
                    >
                </span>
            {/each}
            {#if section.params.length < Section.MAX_PARAMS}
                <input
                    class="param-ghost"
                    placeholder="dato…"
                    onchange={(e) => addParam(e.currentTarget)}
                    onkeydown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                    aria-label="Nuevo dato"
                />
            {/if}
        {:else}
            <strong class="font-mono text-lg">{formatEuros(section.subtotal)}</strong>
        {/if}
        <span class="card-controls inline-flex">
            <button
                class="mini"
                onclick={clone}
                title="Clonar {section.isFunction ? 'receta' : 'sección'}"
                aria-label="Clonar {section.isFunction ? 'receta' : 'sección'}"
            >
                <Icon name="clone" size={18} />
            </button>
            <RowActions
                id={section.id}
                confirm={section.isFunction
                    ? `Quitar la receta «${section.title}»; sus ${section.callers} líneas pasan a fijo`
                    : `Quitar la sección «${section.title}»`}
                label={section.isFunction ? 'receta' : 'sección'}
                size={18}
            />
        </span>
    </div>
    <div class="overflow-x-auto">
        <table class="cost-table">
            <thead class="cost-thead">
                <tr>
                    {#if !section.isFunction}<th title="Si lo quitas, la línea se ve pero no suma">✓</th>{/if}
                    <th>Concepto</th>
                    <th title="Cómo se escribe el precio: fijo, lote (lo que costó y lo que trae), horas, luz o una receta">Tipo</th>
                    <th class="text-left">Precio de una unidad</th>
                    <th
                        title={section.isFunction
                            ? 'El nombre de un dato de la receta, o un número fijo'
                            : 'Cuántas unidades gastas; en horas, luz y lotes por d, h o min, una duración como 3d 5h 1m'}
                    >
                        × Cantidad
                    </th>
                    <th>Categoría</th>
                    <th>{section.isFunction ? 'Por unidad' : 'Coste'}</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                {#each section.lines as line, lineIndex (line.id)}
                    {@const recipe = view.recipes.find((r) => r.id === line.recipeId)}
                    <tr
                        class="cost-row {line.counts && drag.lineId !== line.id ? '' : 'opacity-45'}"
                        class:drop-before={drag.to === section.id && !drag.clone && drag.index === lineIndex}
                        {@attach dropZone({ sectionId: section.id, recipe: section.isFunction, index: lineIndex, ghost: false })}
                    >
                        {#if !section.isFunction}
                            <td>
                                <input
                                    type="checkbox"
                                    class="check"
                                    checked={line.counts}
                                    onchange={(e) => set(line.id, 'counts', e.currentTarget.checked)}
                                    aria-label="Cuenta"
                                />
                            </td>
                        {/if}
                        <td class="w-full">
                            <input
                                class="concept-input"
                                {@attach liveValue(() => line.name)}
                                {@attach focusOnCreate(line.id)}
                                oninput={(e) => set(line.id, 'name', e.currentTarget.value)}
                                placeholder="Ej. Filamento PLA"
                                aria-label="Concepto"
                                data-row={line.id}
                            />
                        </td>
                        <td>
                            <select
                                class="max-w-40 font-mono text-sm {recipe ? 'recipe-type' : ''}"
                                value={line.recipeId ? `${FUNCTION_OPTION}${line.recipeId}` : line.type}
                                onchange={(e) => setType(line.id, e.currentTarget.value)}
                                aria-label="Tipo"
                            >
                                {#each LINE_TYPE_OPTIONS as [value, label] (value)}<option {value}>{label}</option>{/each}
                                {#each recipes as option (option.id)}<option value="{FUNCTION_OPTION}{option.id}">{option.title}</option>{/each}
                            </select>
                        </td>
                        <td>
                            {#if recipe}
                                <span class="price-cell">
                                    {#each recipe.params as param (param)}
                                        <input
                                            class="numeric w-22"
                                            {@attach liveValue(() => line.args[param] ?? '')}
                                            oninput={(e) => store.edit({ op: 'setArg', id: line.id, param, value: e.currentTarget.value })}
                                            onchange={() => store.edit({ op: 'normalize', id: line.id, param })}
                                            placeholder={param}
                                            aria-label={param}
                                        />
                                    {/each}
                                </span>
                            {:else}
                                <span class="price-cell">
                                    {#if line.type === 'power'}
                                        <input
                                            class="numeric w-18"
                                            {@attach liveValue(() => line.watts)}
                                            oninput={(e) => set(line.id, 'watts', e.currentTarget.value)}
                                            inputmode="decimal"
                                            placeholder="0"
                                            aria-label="Potencia en W"
                                        />
                                        W a
                                    {/if}
                                    <input
                                        class="numeric w-18"
                                        {@attach liveValue(() => line.price)}
                                        oninput={(e) => set(line.id, 'price', e.currentTarget.value)}
                                        inputmode="decimal"
                                        placeholder="0"
                                        aria-label="Precio €"
                                    />
                                    {#if line.type === 'fixed'}
                                        €
                                    {:else if line.type === 'lot'}
                                        € por
                                        <input
                                            class="numeric w-16"
                                            {@attach liveValue(() => line.size)}
                                            oninput={(e) => set(line.id, 'size', e.currentTarget.value)}
                                            inputmode="decimal"
                                            placeholder="1"
                                            aria-label="Lo que trae el lote"
                                        />
                                        <input
                                            class="w-14 font-mono text-sm"
                                            {@attach liveValue(() => line.unit)}
                                            oninput={(e) => set(line.id, 'unit', e.currentTarget.value)}
                                            placeholder="ud"
                                            aria-label="Unidad del lote"
                                        />
                                    {:else if line.type === 'hours'}
                                        €/h
                                    {:else}
                                        €/kWh
                                    {/if}
                                </span>
                            {/if}
                        </td>
                        <td
                            class={dropTarget === line.id ? 'drop-target' : ''}
                            ondragover={(e) => section.isFunction && dragOver(e, line.id)}
                            ondragleave={() => (dropTarget = null)}
                            ondrop={(e) => dropParam(e, line.id)}
                        >
                            {#if section.params.includes(line.quantity.trim())}
                                <span class="param flex w-24 items-center justify-between pr-1!">
                                    <span class="font-mono text-sm">{line.quantity.trim()}</span>
                                    <button class="mini px-0.5!" onclick={() => set(line.id, 'quantity', '')} aria-label="Quitar el dato de la Cantidad">×</button>
                                </span>
                            {:else}
                                <input
                                    class="numeric highlighted w-24"
                                    {@attach liveValue(() => line.quantity)}
                                    oninput={(e) => set(line.id, 'quantity', e.currentTarget.value)}
                                    onchange={() => store.edit({ op: 'normalize', id: line.id })}
                                    inputmode={line.timeUnit ? 'text' : 'decimal'}
                                    placeholder={line.timeUnit ? '3h 5m' : '0'}
                                    title={line.timeUnit ? 'Duración: 3d 5h 1m 3s, 15:08 (horas:minutos) o un número' : 'Cuántas unidades gastas'}
                                    aria-label="Cantidad"
                                />
                            {/if}
                        </td>
                        <td>
                            {#if !recipe}<TagSelect item={line} {categories} />{/if}
                        </td>
                        {#if section.isFunction}
                            <td class="amount-cell font-normal text-muted">{formatNumber(line.unitPrice)} €/{line.unitLabel}</td>
                        {:else}
                            <td class="amount-cell {line.counts ? '' : 'line-through'}">{formatEuros(line.cost)}</td>
                        {/if}
                        <td class="actions-cell">
                            <span class="row-controls">
                                <button
                                    class="mini drag-handle"
                                    onpointerdown={(e) => startDrag(e, line.id)}
                                    onpointermove={moveDrag}
                                    onpointerup={endDrag}
                                    onpointercancel={() => (drag.lineId = drag.to = null)}
                                    title="Arrastrar línea: suéltala en otra fila para moverla o en «Escribe aquí…» para clonarla"
                                    aria-label="Arrastrar línea"
                                >
                                    <Icon name="drag" size={16} />
                                </button>
                                <button class="mini px-0.5" onclick={() => store.edit({ op: 'clone', id: line.id })} title="Clonar línea" aria-label="Clonar línea">
                                    <Icon name="clone" size={16} />
                                </button>
                                <RowActions id={line.id} />
                            </span>
                        </td>
                    </tr>
                {/each}
                <tr
                    class:drop-before={drag.to === section.id && !drag.clone && drag.index === section.lines.length}
                    class:drop-clone={drag.to === section.id && drag.clone}
                    {@attach dropZone({ sectionId: section.id, recipe: section.isFunction, index: section.lines.length, ghost: true })}
                >
                    {@render ghostCells('line', 'Escribe aquí para añadir una línea…', 'Nueva línea')}
                </tr>
                {#if section.surcharges.length}
                    <tr class="border-t-2 border-dashed border-[#AEBCCB] bg-[#E8EFF8]">
                        <td colspan={columns} class="font-mono text-xs text-[#3F4E5D]">
                            {section.isFunction ? 'Recargos de la receta · se aplican en cada unidad' : `Recargos sobre la sección · base ${formatEuros(section.base)}`}
                        </td>
                    </tr>
                {/if}
                {#each section.surcharges as surcharge (surcharge.id)}
                    <tr class="cost-row {surcharge.counts ? '' : 'opacity-45'}">
                        {#if !section.isFunction}
                            <td>
                                <input
                                    type="checkbox"
                                    class="check"
                                    checked={surcharge.counts}
                                    onchange={(e) => set(surcharge.id, 'counts', e.currentTarget.checked)}
                                    aria-label="Cuenta"
                                />
                            </td>
                        {/if}
                        <td class="w-full">
                            <input
                                class="concept-input"
                                {@attach liveValue(() => surcharge.name)}
                                {@attach focusOnCreate(surcharge.id)}
                                oninput={(e) => set(surcharge.id, 'name', e.currentTarget.value)}
                                placeholder="Ej. Riesgo por fallos"
                                aria-label="Concepto"
                                data-row={surcharge.id}
                            />
                        </td>
                        <td colspan="3">
                            <span class="inline-flex items-center gap-1">
                                <input
                                    class="numeric highlighted w-18"
                                    {@attach liveValue(() => surcharge.percent)}
                                    oninput={(e) => set(surcharge.id, 'percent', e.currentTarget.value)}
                                    inputmode="decimal"
                                    placeholder="0"
                                    aria-label="Porcentaje"
                                />
                                <span class="font-mono text-[13px] text-[#3F4E5D]">% de la base</span>
                            </span>
                        </td>
                        <td><TagSelect item={surcharge} {categories} /></td>
                        {#if section.isFunction}
                            <td class="amount-cell font-normal text-muted">+ {surcharge.percent || 0} %</td>
                        {:else}
                            <td class="amount-cell {surcharge.counts ? '' : 'line-through'}">{formatEuros(surcharge.amount)}</td>
                        {/if}
                        <td class="actions-cell">
                            <span class="row-controls">
                                <RowActions id={surcharge.id} />
                            </span>
                        </td>
                    </tr>
                {/each}
                <tr>
                    {@render ghostCells(
                        'surcharge',
                        `Escribe aquí para añadir un recargo (% ${section.isFunction ? 'de la receta' : 'de la sección'})…`,
                        'Nuevo recargo',
                    )}
                </tr>
            </tbody>
        </table>
    </div>
</div>

<style lang="postcss">
    @reference '../app.css';

    /* Tarjeta de una receta: como `paper`, con el borde y la sombra en marrón. */
    .recipe-card {
        @apply min-w-0 rounded-md border-2 border-recipe bg-white shadow-[4px_4px_0_var(--recipe)];
    }
    /* Cabecera de una receta: título, datos y acciones, sobre fondo pósit. */
    .recipe-header {
        @apply flex flex-wrap items-center gap-3 border-b-2 border-recipe bg-recipe-soft px-4 py-2;
    }
    /* Dato de una receta, como una pastilla marrón (en la cabecera o en una Cantidad). */
    .param {
        @apply rounded-full border-2 border-recipe bg-recipe-soft px-2.5 py-0.5 font-semibold text-recipe-ink;
    }
    /* Hueco para escribir un dato nuevo de una receta. */
    .param-ghost {
        @apply w-24 rounded-full border-2 border-dashed border-recipe bg-white/60 px-2.5 py-0.5 font-mono text-sm italic placeholder:text-[#9AA9B8];
    }
    /* Cantidad sobre la que se arrastra un dato. */
    .drop-target {
        @apply outline-2 -outline-offset-2 outline-recipe outline-dashed;
    }
    /* Desplegable «Tipo» de una línea que llama a una receta. */
    .recipe-type {
        @apply border-2 border-recipe bg-recipe-soft font-semibold text-recipe-ink;
    }
    /*
     * Controles que solo se ven al pasar el ratón (o al tocar la tarjeta en una pantalla táctil): los de la
     * tarjeta con la tarjeta, y los de cada fila con su fila. Las filas fantasma, además, se despliegan.
     */
    .card-controls,
    .row-controls {
        @apply pointer-events-none opacity-0 transition-opacity duration-200;
    }
    .section-card:hover .card-controls,
    .revealed .card-controls,
    .revealed .row-controls,
    tr:hover .row-controls,
    tr:focus-within .row-controls {
        @apply pointer-events-auto opacity-100;
    }
    .ghost-fold {
        @apply grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity] duration-200;
    }
    .section-card:hover .ghost-fold,
    .section-card:focus-within .ghost-fold,
    .revealed .ghost-fold {
        @apply grid-rows-[1fr] opacity-100;
    }
    /* Celda de los controles de una fila: no ocupa ancho, y los controles flotan a la derecha de la fila. */
    .actions-cell {
        @apply relative w-0 p-0!;
    }
    .actions-cell .row-controls {
        @apply absolute top-1/2 right-1 inline-flex -translate-y-1/2 rounded-md border border-line bg-white px-0.5 shadow-[2px_2px_0_var(--line)];
    }
    /* Asa para arrastrar una línea; en pantallas táctiles, arrastrarla no desplaza la página. */
    .drag-handle {
        @apply cursor-grab touch-none px-0.5;
    }
    /* Raya donde caería la línea que se arrastra, y fila fantasma donde se clonaría. */
    .drop-before > td {
        @apply shadow-[inset_0_3px_0_var(--accent)];
    }
    .drop-clone {
        @apply bg-[#E3ECFA] outline-2 -outline-offset-2 outline-accent outline-dashed;
    }
    /*
     * Fila fantasma al final de las líneas o de los recargos: al escribir en ella se crea una fila nueva. Sus
     * celdas no llevan relleno para plegarse del todo; el relleno y la raya van dentro de lo que se pliega.
     */
    .ghost-cell {
        @apply p-0!;
    }
    .ghost-fold > div {
        @apply min-h-0 overflow-hidden border-t border-dashed border-[#AEBCCB];
    }
    .ghost-mark {
        @apply py-1.5 text-center font-mono text-lg text-[#AEBCCB];
    }
    .ghost-input {
        @apply concept-input border-dashed italic placeholder:text-[#9AA9B8];
    }
    /* Celda del precio de una unidad: sus campos en fila con el texto que los une («€ por», «W a»…). */
    .price-cell {
        @apply inline-flex items-center gap-1.5 font-mono text-[13px] text-muted;
    }
</style>

<!--
    @component
    Un bloque del producto abierto: título editable con su subtotal y la tabla de sus líneas de gasto
    y de sus recargos sobre el bloque. Si es un grupo función, lleva sus datos de entrada y su fórmula en vez
    del subtotal.
-->

<script lang="ts" module>
    import { LINE_TYPE_LABELS } from '../model/LineType.ts'

    /** Opciones básicas del desplegable «Tipo»: el valor de cada tipo y su nombre. */
    const LINE_TYPE_OPTIONS = Object.entries(LINE_TYPE_LABELS)
    /** Prefijo del valor de las opciones de «Tipo» que llaman a un grupo función, seguido de su posición. */
    const FUNCTION_OPTION = 'ƒ'
</script>

<script lang="ts">
    import type { CostSheet } from '../model/CostSheet.ts'
    import { Line } from '../model/Line.ts'
    import type { BasicLineType } from '../model/LineType.ts'
    import type { Section } from '../model/Section.ts'
    import { Surcharge } from '../model/Surcharge.ts'
    import { formatEuros, formatNumber } from '../model/text/numbers.ts'
    import RowActions from './RowActions.svelte'
    import TagSelect from './TagSelect.svelte'

    /** `section` es el bloque número `index` de `product`. */
    let { product, section, index }: { product: CostSheet; section: Section; index: number } = $props()

    const base = $derived(section.base())
    /** Grupos función a los que pueden llamar sus líneas; desde un grupo función, ninguno. */
    const functions = $derived(section.isFunction ? [] : product.functions)

    /** Añade una línea en blanco con la categoría de la última. */
    function addLine() {
        const line = new Line()
        product.assignCategory(line, section.lastCategory())
        section.addLine(line)
    }

    /** Añade un recargo en blanco con la categoría de la última línea. */
    function addSurcharge() {
        const surcharge = new Surcharge(false)
        product.assignCategory(surcharge, section.lastCategory())
        section.addSurcharge(surcharge)
    }

    /**
     * Valor de la línea en el desplegable «Tipo».
     * @param line Línea del bloque.
     * @returns El tipo básico, o el prefijo de función con la posición de su grupo.
     */
    function typeValue(line: Line): string {
        return line.function ? `${FUNCTION_OPTION}${functions.indexOf(line.function)}` : line.type
    }

    /**
     * Cambia el tipo de una línea al elegido en el desplegable «Tipo».
     * @param line Línea del bloque.
     * @param value Valor de la opción elegida.
     */
    function setType(line: Line, value: string) {
        if (value.startsWith(FUNCTION_OPTION)) {
            line.call(functions[Number(value.slice(FUNCTION_OPTION.length))])
        } else {
            line.type = value as BasicLineType
        }
    }

    /**
     * Cambia el nombre de un dato del grupo función; si no se puede, el campo vuelve al nombre de antes.
     * @param param Nombre actual.
     * @param input Campo con el nombre nuevo.
     */
    function renameParam(param: string, input: HTMLInputElement) {
        product.renameParam(section, param, input.value)
        input.value = section.params.includes(input.value.trim()) ? input.value.trim() : param
    }

    /**
     * Reparto por categoría del coste de una línea, para leerlo debajo.
     * @param line Línea que llama a un grupo función.
     * @returns «Material 2,40 € · Impresora 1,27 €».
     */
    function split(line: Line): string {
        return [...line.byCategory()].map(([category, amount]) => `${category} ${formatEuros(amount)}`).join(' · ')
    }
</script>

<div class="overflow-hidden {section.isFunction ? 'function-card' : 'paper'}">
    <div class={section.isFunction ? 'function-header' : 'card-header'}>
        {#if section.isFunction}
            <span class="hand-title text-[34px] text-accent" title="Grupo función: no suma por sí solo">ƒ</span>
        {/if}
        <input
            class="editable-title block-title flex-1 {section.isFunction ? 'min-w-56' : 'min-w-0'}"
            bind:value={section.title}
            aria-label={section.isFunction ? 'Título del grupo función' : 'Título del bloque'}
        />
        {#if section.isFunction}
            <span class="flex flex-wrap items-center gap-1.5 font-mono text-muted">
                (
                {#each section.params as param (param)}
                    <span class="param inline-flex items-center gap-0.5 pr-1!">
                        <input
                            class="borderless min-w-10 field-sizing-content font-mono text-[14px] font-semibold text-accent"
                            value={param}
                            onchange={(e) => renameParam(param, e.currentTarget)}
                            aria-label="Nombre del dato"
                        />
                        <button class="mini px-0.5!" onclick={() => product.removeParam(section, param)} aria-label="Quitar el dato «{param}»">×</button>
                    </span>
                {/each}
                )
                <button class="add-link text-[15px]" onclick={() => product.addParam(section)}>+ dato</button>
            </span>
            <span class="order-last basis-full font-mono text-sm" title="Lo que cuesta una unidad según sus datos">
                Una unidad = {section.formula()}
            </span>
        {:else}
            <strong class="font-mono text-lg">{formatEuros(section.subtotal())}</strong>
        {/if}
        <RowActions
            list={product.sections}
            {index}
            reorder={(sections) => (product.sections = sections)}
            onremove={() => product.removeSection(section)}
            confirm={section.isFunction
                ? `Quitar el grupo función «${section.title}»; sus ${product.callers(section).length} líneas pasan a común`
                : `Quitar el bloque «${section.title}»`}
            label="bloque"
            size={18}
        />
    </div>
    <div class="overflow-x-auto">
        <table class="cost-table">
            <thead class="cost-thead">
                <tr>
                    <th title="Si lo quitas, la línea se ve pero no suma">✓</th>
                    <th>Concepto</th>
                    <th title="Cómo se escribe el precio: común, lote (lo que costó y lo que trae), horas, luz o un grupo función">Tipo</th>
                    <th class="text-left">Precio de una unidad</th>
                    <th
                        title={section.isFunction
                            ? 'El nombre de un dato del grupo, o un número fijo'
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
                {#each section.lines as line, lineIndex (line)}
                    {@const fn = line.function}
                    <tr class="cost-row {line.counts ? '' : 'opacity-45'}">
                        <td><input type="checkbox" class="check" bind:checked={line.counts} aria-label="Cuenta" /></td>
                        <td class="w-full">
                            <input class="concept-input" bind:value={line.name} placeholder="Ej. Filamento PLA" aria-label="Concepto" />
                        </td>
                        <td>
                            <select
                                class="max-w-40 font-mono text-sm {fn ? 'function-type' : ''}"
                                value={typeValue(line)}
                                onchange={(e) => setType(line, e.currentTarget.value)}
                                aria-label="Tipo"
                            >
                                {#each LINE_TYPE_OPTIONS as [value, label] (value)}<option {value}>{label}</option>{/each}
                                {#each functions as option, i (option)}<option value="{FUNCTION_OPTION}{i}">ƒ {option.title}</option>{/each}
                            </select>
                        </td>
                        <td>
                            {#if fn}
                                <span class="price-cell items-end!">
                                    {#each fn.params as param (param)}
                                        <label class="inline-flex flex-col">
                                            <span class="mb-0.5 text-[10px] leading-none uppercase">{param}</span>
                                            <input
                                                class="numeric w-22"
                                                value={line.arg(param)}
                                                oninput={(e) => line.setArg(param, e.currentTarget.value)}
                                                onchange={() => line.normalizeArg(param)}
                                                placeholder={fn.isTimeParam(param) ? '3h 5m' : '0'}
                                            />
                                        </label>
                                    {/each}
                                </span>
                                <div class="mt-0.5 font-mono text-[11px] text-muted">= {formatEuros(line.unitPrice())} cada una</div>
                                <div class="font-mono text-[10px] text-muted">{split(line)}</div>
                            {:else}
                                <span class="price-cell">
                                    {#if line.type === 'power'}
                                        <input class="numeric w-18" bind:value={line.watts} inputmode="decimal" placeholder="0" aria-label="Potencia en W" />
                                        W a
                                    {/if}
                                    <input class="numeric w-18" bind:value={line.price} inputmode="decimal" placeholder="0" aria-label="Precio €" />
                                    {#if line.type === 'common'}
                                        €
                                    {:else if line.type === 'lot'}
                                        € por
                                        <input class="numeric w-16" bind:value={line.size} inputmode="decimal" placeholder="1" aria-label="Lo que trae el lote" />
                                        <input class="w-14 font-mono text-sm" bind:value={line.unit} placeholder="ud" aria-label="Unidad del lote" />
                                    {:else if line.type === 'hours'}
                                        €/h
                                    {:else}
                                        €/kWh
                                    {/if}
                                </span>
                            {/if}
                        </td>
                        <td>
                            <input
                                class="numeric highlighted w-24 {section.params.includes(line.quantity.trim()) ? 'param' : ''}"
                                bind:value={line.quantity}
                                onchange={() => line.normalizeQuantity()}
                                list={section.isFunction ? `params-${index}` : undefined}
                                inputmode={line.timeUnit() || section.isFunction ? 'text' : 'decimal'}
                                placeholder={line.timeUnit() ? '3h 5m' : '0'}
                                title={line.timeUnit() ? 'Duración: 3d 5h 1m 3s, 15:08 (horas:minutos) o un número' : 'Cuántas unidades gastas'}
                                aria-label="Cantidad"
                            />
                        </td>
                        <td>
                            {#if fn}
                                <span class="font-mono text-[12px] text-muted" title="El coste se reparte en las categorías de «{fn.title}»">de la función</span>
                            {:else}
                                <TagSelect {product} item={line} />
                            {/if}
                        </td>
                        {#if section.isFunction}
                            <td class="amount-cell font-normal text-muted">{formatNumber(line.unitPrice())} €/{line.unitLabel()}</td>
                        {:else}
                            <td class="amount-cell {line.counts ? '' : 'line-through'}">{formatEuros(line.cost())}</td>
                        {/if}
                        <td><RowActions list={section.lines} index={lineIndex} reorder={(lines) => (section.lines = lines)} onremove={() => section.removeLine(line)} /></td>
                    </tr>
                {/each}
                {#if section.surcharges.length}
                    <tr class="border-t-2 border-dashed border-[#AEBCCB] bg-[#E8EFF8]">
                        <td colspan="8" class="font-mono text-xs text-[#3F4E5D]">
                            {section.isFunction ? 'Recargos del grupo · se aplican en cada unidad' : `Recargos sobre el bloque · base ${formatEuros(base)}`}
                        </td>
                    </tr>
                {/if}
                {#each section.surcharges as surcharge, surchargeIndex (surcharge)}
                    <tr class="cost-row {surcharge.counts ? '' : 'opacity-45'}">
                        <td><input type="checkbox" class="check" bind:checked={surcharge.counts} aria-label="Cuenta" /></td>
                        <td class="w-full">
                            <input class="concept-input" bind:value={surcharge.name} placeholder="Ej. Riesgo por fallos" aria-label="Concepto" />
                        </td>
                        <td colspan="3">
                            <span class="inline-flex items-center gap-1">
                                <input class="numeric highlighted w-18" bind:value={surcharge.percent} inputmode="decimal" placeholder="0" aria-label="Porcentaje" />
                                <span class="font-mono text-[13px] text-[#3F4E5D]">% de la base</span>
                            </span>
                        </td>
                        <td><TagSelect {product} item={surcharge} /></td>
                        {#if section.isFunction}
                            <td class="amount-cell font-normal text-muted">+ {surcharge.percent || 0} %</td>
                        {:else}
                            <td class="amount-cell {surcharge.counts ? '' : 'line-through'}">{formatEuros(surcharge.amount(base))}</td>
                        {/if}
                        <td><RowActions list={section.surcharges} index={surchargeIndex} reorder={(surcharges) => (section.surcharges = surcharges)} onremove={() => section.removeSurcharge(surcharge)} /></td>
                    </tr>
                {/each}
            </tbody>
        </table>
        {#if section.isFunction}
            <datalist id="params-{index}">
                {#each section.params as param (param)}<option value={param}></option>{/each}
            </datalist>
        {/if}
    </div>
    <div class="card-footer flex gap-5">
        <button class="add-link" onclick={addLine}>+ línea</button>
        <button class="add-link" onclick={addSurcharge}>+ recargo (% {section.isFunction ? 'del grupo' : 'del bloque'})</button>
    </div>
</div>

<style lang="postcss">
    @reference '../app.css';

    /* Tarjeta de un grupo función: como `paper`, con el borde azul. */
    .function-card {
        @apply min-w-0 rounded-md border-2 border-accent bg-white;
    }
    /* Cabecera de un grupo función: ƒ, título, datos, fórmula y acciones, sobre azul claro. */
    .function-header {
        @apply flex flex-wrap items-center gap-3 border-b-2 border-accent bg-[#E3ECFA] px-4 py-2;
    }
    /* Dato de un grupo función, como una pastilla azul (en la cabecera o en una Cantidad). */
    .param {
        @apply rounded-full border-2 border-accent bg-[#E3ECFA] px-2.5 py-0.5 font-semibold text-accent;
    }
    /* Desplegable «Tipo» de una línea que llama a un grupo función. */
    .function-type {
        @apply border-2 border-accent bg-[#E3ECFA] font-semibold text-accent;
    }
    /* Celda del precio de una unidad: sus campos en fila con el texto que los une («€ por», «W a»…). */
    .price-cell {
        @apply inline-flex items-center gap-1.5 font-mono text-[13px] text-muted;
    }
</style>

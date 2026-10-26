<!--
    @component
    Un bloque del producto abierto: título editable con su subtotal y la tabla de sus líneas de gasto
    y de sus recargos sobre el bloque.
-->

<script lang="ts" module>
    import { LINE_TYPE_LABELS } from '../model/LineType.ts'

    /** Opciones del desplegable «Tipo»: el valor de cada tipo y su nombre. */
    const LINE_TYPE_OPTIONS = Object.entries(LINE_TYPE_LABELS)
</script>

<script lang="ts">
    import type { CostSheet } from '../model/CostSheet.ts'
    import { Line } from '../model/Line.ts'
    import type { Section } from '../model/Section.ts'
    import { Surcharge } from '../model/Surcharge.ts'
    import { formatEuros } from '../model/text/numbers.ts'
    import RowActions from './RowActions.svelte'
    import TagSelect from './TagSelect.svelte'

    /** `section` es el bloque número `index` de `product`. */
    let { product, section, index }: { product: CostSheet; section: Section; index: number } = $props()

    const base = $derived(section.base())

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
</script>

<div class="paper overflow-hidden">
    <div class="card-header">
        <input
            class="editable-title block-title min-w-0 flex-1"
            bind:value={section.title}
            aria-label="Título del bloque"
        />
        <strong class="font-mono text-lg">{formatEuros(section.subtotal())}</strong>
        <RowActions
            list={product.sections}
            {index}
            reorder={(sections) => (product.sections = sections)}
            onremove={() => product.removeSection(section)}
            confirm={`Quitar el bloque «${section.title}»`}
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
                    <th title="Cómo se escribe el precio: común, lote (lo que costó y lo que trae), horas o luz">Tipo</th>
                    <th class="text-left">Precio de una unidad</th>
                    <th title="Cuántas unidades gastas; en horas, luz y lotes por d, h o min, una duración como 3d 5h 1m">× Cantidad</th>
                    <th>Categoría</th>
                    <th>Coste</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                {#each section.lines as line, lineIndex (line)}
                    <tr class="cost-row {line.counts ? '' : 'opacity-45'}">
                        <td><input type="checkbox" class="check" bind:checked={line.counts} aria-label="Cuenta" /></td>
                        <td class="w-full">
                            <input class="concept-input" bind:value={line.name} placeholder="Ej. Filamento PLA" aria-label="Concepto" />
                        </td>
                        <td>
                            <select class="font-mono text-sm" bind:value={line.type} aria-label="Tipo">
                                {#each LINE_TYPE_OPTIONS as [value, label] (value)}<option {value}>{label}</option>{/each}
                            </select>
                        </td>
                        <td>
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
                        </td>
                        <td>
                            <input
                                class="numeric highlighted w-24"
                                bind:value={line.quantity}
                                onchange={() => line.normalizeQuantity()}
                                inputmode={line.timeUnit() ? 'text' : 'decimal'}
                                placeholder={line.timeUnit() ? '3h 5m' : '0'}
                                title={line.timeUnit() ? 'Duración: 3d 5h 1m 3s, 15:08 (horas:minutos) o un número' : 'Cuántas unidades gastas'}
                                aria-label="Cantidad"
                            />
                        </td>
                        <td><TagSelect {product} item={line} /></td>
                        <td class="amount-cell {line.counts ? '' : 'line-through'}">{formatEuros(line.cost())}</td>
                        <td><RowActions list={section.lines} index={lineIndex} reorder={(lines) => (section.lines = lines)} onremove={() => section.removeLine(line)} /></td>
                    </tr>
                {/each}
                {#if section.surcharges.length}
                    <tr class="border-t-2 border-dashed border-[#AEBCCB] bg-[#E8EFF8]">
                        <td colspan="8" class="font-mono text-xs text-[#3F4E5D]">
                            Recargos sobre el bloque · base {formatEuros(base)}
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
                        <td class="amount-cell {surcharge.counts ? '' : 'line-through'}">{formatEuros(surcharge.amount(base))}</td>
                        <td><RowActions list={section.surcharges} index={surchargeIndex} reorder={(surcharges) => (section.surcharges = surcharges)} onremove={() => section.removeSurcharge(surcharge)} /></td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
    <div class="card-footer flex gap-5">
        <button class="add-link" onclick={addLine}>+ línea</button>
        <button class="add-link" onclick={addSurcharge}>+ recargo (% del bloque)</button>
    </div>
</div>

<style lang="postcss">
    @reference '../app.css';

    /* Celda del precio de una unidad: sus campos en fila con el texto que los une («€ por», «W a»…). */
    .price-cell {
        @apply inline-flex items-center gap-1.5 font-mono text-[13px] text-muted;
    }
</style>

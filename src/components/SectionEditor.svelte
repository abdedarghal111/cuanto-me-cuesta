<!--
    @component
    Un bloque del producto abierto: título editable con su subtotal y la tabla de sus líneas de gasto
    y de sus recargos sobre el bloque.
-->

<script lang="ts">
    import type { CostSheet } from '../model/CostSheet.ts'
    import { Line } from '../model/Line.ts'
    import { LINE_TYPE_LABELS } from '../model/LineType.ts'
    import type { Section } from '../model/Section.ts'
    import { Surcharge } from '../model/Surcharge.ts'
    import { TIME_UNIT_LABELS, formatEuros } from '../model/text/numbers.ts'
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
                    <th title="Cómo se escriben «por» y «consumo»: número, tiempo (una duración como 3d 5h 1m) o fijo (un importe en €)">Tipo</th>
                    <th>Precio €</th>
                    <th>por</th>
                    <th title="Texto libre para leerlo: g, m, l, uds…">Unidad</th>
                    <th>Consumo</th>
                    <th title="Multiplicador: cuántas veces se repite el consumo (admite 0,5)">×</th>
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
                                {#each Object.entries(LINE_TYPE_LABELS) as [value, label] (value)}<option {value}>{label}</option>{/each}
                            </select>
                        </td>
                        {#if line.type === 'fixed'}
                            <td><input class="numeric w-20" value="1" disabled aria-label="Precio €" /></td>
                            <td><input class="numeric w-16" value="1" disabled aria-label="Por" /></td>
                        {:else}
                            <td><input class="numeric w-20" bind:value={line.price} inputmode="decimal" placeholder="0" aria-label="Precio €" /></td>
                            <td><input class="numeric w-16" bind:value={line.per} inputmode="decimal" placeholder="1" aria-label="Por" /></td>
                        {/if}
                        <td>
                            {#if line.type === 'time'}
                                <select class="w-24 font-mono text-sm" bind:value={line.unit} aria-label="Unidad">
                                    {#each Object.entries(TIME_UNIT_LABELS) as [value, label] (value)}<option {value}>{label}</option>{/each}
                                </select>
                            {:else}
                                <input class="w-24 font-mono text-sm" bind:value={line.unit} placeholder="g, m…" aria-label="Unidad" />
                            {/if}
                        </td>
                        <td>
                            {#if line.type === 'time'}
                                <input
                                    class="numeric highlighted w-24"
                                    bind:value={line.usage}
                                    onchange={() => line.normalizeUsage()}
                                    placeholder="3d 5h 1m"
                                    title="Duración: 3d 5h 1m 3s, 15:08 (horas:minutos) o un número en la unidad"
                                    aria-label="Consumo"
                                />
                            {:else}
                                <input class="numeric highlighted w-24" bind:value={line.usage} inputmode="decimal" placeholder={line.type === 'fixed' ? '0,00 €' : '0'} aria-label="Consumo" />
                            {/if}
                        </td>
                        <td><input class="numeric w-12" bind:value={line.multiplier} inputmode="decimal" placeholder="1" aria-label="Multiplicador" /></td>
                        <td><TagSelect {product} item={line} /></td>
                        <td class="amount-cell {line.counts ? '' : 'line-through'}">{formatEuros(line.cost())}</td>
                        <td><RowActions list={section.lines} index={lineIndex} reorder={(lines) => (section.lines = lines)} onremove={() => section.removeLine(line)} /></td>
                    </tr>
                {/each}
                {#if section.surcharges.length}
                    <tr class="border-t-2 border-dashed border-[#AEBCCB] bg-[#E8EFF8]">
                        <td colspan="11" class="font-mono text-xs text-[#3F4E5D]">
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
                        <td colspan="6">
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

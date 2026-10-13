<!--
    @component
    Un bloque del producto abierto: título editable con su subtotal y la tabla de sus líneas de gasto
    y de sus recargos sobre el bloque.
-->

<script lang="ts">
    import type { CostSheet } from '../model/CostSheet.ts'
    import { Line } from '../model/Line.ts'
    import { LINE_TYPE_LABELS, type LineType } from '../model/LineType.ts'
    import type { Section } from '../model/Section.ts'
    import type { Summary } from '../model/Summary.ts'
    import { Surcharge } from '../model/Surcharge.ts'
    import { TIME_UNIT_SECONDS, formatEuros, normalizeDuration, timeUnit } from '../model/text/numbers.ts'
    import RowActions from './RowActions.svelte'
    import TagSelect from './TagSelect.svelte'

    /** `section` es el bloque número `index` de `product`. */
    let { product, summary, section, index }: { product: CostSheet; summary: Summary; section: Section; index: number } = $props()

    const base = $derived(summary.sectionBases[index] ?? 0)

    /** Nombre de cada unidad de tiempo en el desplegable. */
    const TIME_UNIT_LABELS: Record<string, string> = { d: 'días', h: 'horas', min: 'minutos' }

    /** Cambia el tipo de la línea: `fixed` pone Precio y Por a 1 y `time` deja la unidad en d, h o min. */
    function setType(line: Line, type: LineType) {
        line.type = type
        if (type === 'fixed') {
            line.price = '1'
            line.per = '1'
            line.unit = line.unit.trim() || '€'
        }
        if (type === 'time') {
            line.unit = timeUnit(line.unit)
        }
    }

    /** Añade una línea en blanco con la categoría de la última. */
    function addLine() {
        const line = new Line()
        product.assignCategory(line, section.lines.at(-1)?.category ?? '')
        section.addLine(line)
    }

    /** Añade un recargo en blanco con la categoría de la última línea. */
    function addSurcharge() {
        const surcharge = new Surcharge(false)
        product.assignCategory(surcharge, section.lines.at(-1)?.category ?? '')
        section.addSurcharge(surcharge)
    }
</script>

<div class="paper overflow-hidden">
    <div class="flex items-center justify-between gap-3 border-b-2 border-ink bg-[#E8EFF8] px-4 py-2">
        <input
            class="editable-title min-w-0 flex-1 font-hand text-[32px] leading-none font-bold text-[#183F86]"
            bind:value={section.title}
            aria-label="Título del bloque"
        />
        <strong class="font-mono text-lg">{formatEuros(summary.sectionSubtotals[index] ?? 0)}</strong>
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
        <table class="w-full border-collapse text-base whitespace-nowrap [&_td]:px-1 [&_td]:py-1.5 [&_th]:px-1 [&_th]:py-1.5 [&_td+td]:border-l [&_td+td]:border-[#E3E9F0] [&_th+th]:border-l [&_th+th]:border-[#E3E9F0]">
            <thead class="bg-[#F7F9FC] text-center font-mono text-xs text-[#3F4E5D]">
                <tr>
                    <th class="font-semibold" title="Si lo quitas, la línea se ve pero no suma">✓</th>
                    <th class="font-semibold">Concepto</th>
                    <th class="font-semibold" title="Cómo se escriben «por» y «consumo»: número, tiempo (una duración como 3d 5h 1m) o fijo (un importe en €)">Tipo</th>
                    <th class="font-semibold">Precio €</th>
                    <th class="font-semibold">por</th>
                    <th class="font-semibold" title="Texto libre para leerlo: g, m, l, uds…">Unidad</th>
                    <th class="font-semibold">Consumo</th>
                    <th class="font-semibold" title="Multiplicador: cuántas veces se repite el consumo (admite 0,5)">×</th>
                    <th class="font-semibold">Categoría</th>
                    <th class="font-semibold">Coste</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                {#each section.lines as line, lineIndex (line)}
                    <tr class="border-t border-[#D5DEE8] even:bg-[#F7F9FC] {line.counts ? '' : 'opacity-45'}">
                        <td><input type="checkbox" class="size-5 accent-ink" bind:checked={line.counts} aria-label="Cuenta" /></td>
                        <td class="w-full">
                            <input class="borderless w-full min-w-24 border-b border-[#C5D1DE] py-1" bind:value={line.name} placeholder="Ej. Filamento PLA" aria-label="Concepto" />
                        </td>
                        <td>
                            <select class="cursor-pointer font-mono text-sm" value={line.type} onchange={(e) => setType(line, e.currentTarget.value as LineType)} aria-label="Tipo">
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
                                <select class="w-24 cursor-pointer font-mono text-sm" bind:value={line.unit} aria-label="Unidad">
                                    {#each Object.keys(TIME_UNIT_SECONDS) as unit (unit)}<option value={unit}>{TIME_UNIT_LABELS[unit]}</option>{/each}
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
                                    onchange={() => (line.usage = normalizeDuration(line.usage, line.unit))}
                                    placeholder="3d 5h 1m"
                                    title="Duración: 3d 5h 1m 3s, 15:08 (horas:minutos) o un número en la unidad"
                                    aria-label="Consumo"
                                />
                            {:else}
                                <input class="numeric highlighted w-24" bind:value={line.usage} inputmode="decimal" placeholder={line.type === 'fixed' ? '0,00 €' : '0'} aria-label="Consumo" />
                            {/if}
                        </td>
                        <td><input class="numeric w-12" bind:value={line.multiplier} inputmode="decimal" placeholder="1" aria-label="Multiplicador" /></td>
                        <td><TagSelect item={line} /></td>
                        <td class="text-right font-mono font-semibold {line.counts ? '' : 'line-through'}">{formatEuros(line.cost())}</td>
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
                    <tr class="border-t border-[#D5DEE8] even:bg-[#F7F9FC] {surcharge.counts ? '' : 'opacity-45'}">
                        <td><input type="checkbox" class="size-5 accent-ink" bind:checked={surcharge.counts} aria-label="Cuenta" /></td>
                        <td class="w-full">
                            <input class="borderless w-full min-w-24 border-b border-[#C5D1DE] py-1" bind:value={surcharge.name} placeholder="Ej. Riesgo por fallos" aria-label="Concepto" />
                        </td>
                        <td colspan="6">
                            <span class="inline-flex items-center gap-1">
                                <input class="numeric highlighted w-18" bind:value={surcharge.percent} inputmode="decimal" placeholder="0" aria-label="Porcentaje" />
                                <span class="font-mono text-[13px] text-[#3F4E5D]">% de la base</span>
                            </span>
                        </td>
                        <td><TagSelect item={surcharge} /></td>
                        <td class="text-right font-mono font-semibold {surcharge.counts ? '' : 'line-through'}">{formatEuros(surcharge.amount(base))}</td>
                        <td><RowActions list={section.surcharges} index={surchargeIndex} reorder={(surcharges) => (section.surcharges = surcharges)} onremove={() => section.removeSurcharge(surcharge)} /></td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
    <div class="flex gap-5 border-t border-dashed border-[#AEBCCB] px-4 py-2">
        <button class="add-link" onclick={addLine}>+ línea</button>
        <button class="add-link" onclick={addSurcharge}>+ recargo (% del bloque)</button>
    </div>
</div>

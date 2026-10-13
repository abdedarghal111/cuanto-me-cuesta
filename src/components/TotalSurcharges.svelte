<!--
    @component
    «Sobre el total» del producto abierto: recargos que se aplican en orden, cada uno sobre lo acumulado.
-->

<script lang="ts">
    import type { CostSheet } from '../model/CostSheet.ts'
    import type { Summary } from '../model/Summary.ts'
    import { Surcharge } from '../model/Surcharge.ts'
    import { formatEuros } from '../model/text/numbers.ts'
    import RowActions from './RowActions.svelte'
    import TagSelect from './TagSelect.svelte'

    let { product, summary }: { product: CostSheet; summary: Summary } = $props()

    /** Añade un recargo sobre el total en blanco y sin categoría. */
    function addSurcharge() {
        product.addTotalSurcharge(new Surcharge(true))
    }
</script>

<div class="paper overflow-hidden">
    <div class="flex items-center justify-between gap-3 border-b-2 border-ink bg-[#E8EFF8] px-4 py-2">
        <h2 class="font-hand text-[32px] leading-none font-bold text-[#183F86]">Sobre el total</h2>
        <span class="font-mono text-sm">coste {formatEuros(summary.cost)} → <strong class="text-lg">{formatEuros(summary.total)}</strong></span>
    </div>
    {#if product.totalSurcharges.length}
        <div class="overflow-x-auto">
            <table class="cost-table">
                <thead class="cost-thead">
                    <tr>
                        <th title="Si lo quitas, el recargo se ve pero no suma">✓</th>
                        <th>Concepto</th>
                        <th title="Porcentaje de lo acumulado hasta esta línea">%</th>
                        <th>Categoría</th>
                        <th>Importe</th>
                        <th>Acumulado</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {#each product.totalSurcharges as surcharge, index (surcharge)}
                        <tr class="border-t border-[#D5DEE8] even:bg-[#F7F9FC] {surcharge.counts ? '' : 'opacity-45'}">
                            <td><input type="checkbox" class="size-5 accent-ink" bind:checked={surcharge.counts} aria-label="Cuenta" /></td>
                            <td class="w-full">
                                <input class="borderless w-full min-w-24 border-b border-[#C5D1DE] py-1" bind:value={surcharge.name} placeholder="Ej. Margen" aria-label="Concepto" />
                            </td>
                            <td><input class="numeric highlighted w-18" bind:value={surcharge.percent} inputmode="decimal" placeholder="0" aria-label="Porcentaje" /></td>
                            <td><TagSelect {product} item={surcharge} /></td>
                            <td class="text-right font-mono font-semibold {surcharge.counts ? '' : 'line-through'}">{formatEuros(summary.totalSurcharges[index]?.amount ?? 0)}</td>
                            <td class="text-right font-mono">{formatEuros(summary.totalSurcharges[index]?.runningTotal ?? 0)}</td>
                            <td><RowActions list={product.totalSurcharges} {index} reorder={(surcharges) => (product.totalSurcharges = surcharges)} onremove={() => product.removeTotalSurcharge(surcharge)} /></td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    {/if}
    <div class="border-t border-dashed border-[#AEBCCB] px-4 py-2">
        <button class="add-link" onclick={addSurcharge}>+ recargo (% de lo acumulado)</button>
    </div>
</div>

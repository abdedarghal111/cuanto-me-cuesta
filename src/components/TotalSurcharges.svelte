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
    <div class="card-header">
        <h2 class="block-title">Sobre el total</h2>
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
                        <tr class="cost-row {surcharge.counts ? '' : 'opacity-45'}">
                            <td><input type="checkbox" class="check" bind:checked={surcharge.counts} aria-label="Cuenta" /></td>
                            <td class="w-full">
                                <input class="concept-input" bind:value={surcharge.name} placeholder="Ej. Margen" aria-label="Concepto" />
                            </td>
                            <td><input class="numeric highlighted w-18" bind:value={surcharge.percent} inputmode="decimal" placeholder="0" aria-label="Porcentaje" /></td>
                            <td><TagSelect {product} item={surcharge} /></td>
                            <td class="amount-cell {surcharge.counts ? '' : 'line-through'}">{formatEuros(summary.totalSurcharges[index]?.amount ?? 0)}</td>
                            <td class="text-right font-mono">{formatEuros(summary.totalSurcharges[index]?.runningTotal ?? 0)}</td>
                            <td><RowActions list={product.totalSurcharges} {index} reorder={(surcharges) => (product.totalSurcharges = surcharges)} onremove={() => product.removeTotalSurcharge(surcharge)} /></td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    {/if}
    <div class="card-footer">
        <button class="add-link" onclick={addSurcharge}>+ recargo (% de lo acumulado)</button>
    </div>
</div>

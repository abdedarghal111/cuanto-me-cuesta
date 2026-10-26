<!--
    @component
    «Sobre el total» del producto abierto: recargos que se aplican en orden, cada uno sobre lo acumulado, y una
    fila fantasma para añadir otro que se despliega al pasar el ratón.
-->

<script lang="ts">
    import { tick } from 'svelte'
    import type { CostSheet } from '../model/CostSheet.ts'
    import type { Summary } from '../model/Summary.ts'
    import { Surcharge } from '../model/Surcharge.ts'
    import { formatEuros } from '../model/text/numbers.ts'
    import RowActions from './RowActions.svelte'
    import TagSelect from './TagSelect.svelte'

    let { product, summary }: { product: CostSheet; summary: Summary } = $props()

    /** Tarjeta, para pasar el foco al recargo que se crea. */
    let card: HTMLDivElement

    /**
     * Crea un recargo sobre el total, sin categoría, con lo escrito en la fila fantasma, vacía la fila y pasa el
     * foco al concepto del recargo nuevo para seguir escribiendo.
     * @param input Campo de la fila fantasma.
     */
    async function addFromGhost(input: HTMLInputElement) {
        const surcharge = new Surcharge(true)
        surcharge.name = input.value
        product.addTotalSurcharge(surcharge)
        input.value = ''
        await tick()
        const field = [...card.querySelectorAll<HTMLInputElement>('[data-concept]')].at(-1)
        field?.focus()
        field?.setSelectionRange(field.value.length, field.value.length)
    }
</script>

<div class="total-card paper overflow-hidden" bind:this={card}>
    <div class="card-header">
        <h2 class="block-title">Sobre el total</h2>
        <span class="font-mono text-sm">coste {formatEuros(summary.cost)} → <strong class="text-lg">{formatEuros(summary.total)}</strong></span>
    </div>
    <div class="overflow-x-auto">
        <table class="cost-table">
            {#if product.totalSurcharges.length}
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
            {/if}
            <tbody>
                {#each product.totalSurcharges as surcharge, index (surcharge)}
                    <tr class="cost-row {surcharge.counts ? '' : 'opacity-45'}">
                        <td><input type="checkbox" class="check" bind:checked={surcharge.counts} aria-label="Cuenta" /></td>
                        <td class="w-full">
                            <input class="concept-input" bind:value={surcharge.name} placeholder="Ej. Margen" aria-label="Concepto" data-concept />
                        </td>
                        <td><input class="numeric highlighted w-18" bind:value={surcharge.percent} inputmode="decimal" placeholder="0" aria-label="Porcentaje" /></td>
                        <td><TagSelect {product} item={surcharge} /></td>
                        <td class="amount-cell {surcharge.counts ? '' : 'line-through'}">{formatEuros(summary.totalSurcharges[index]?.amount ?? 0)}</td>
                        <td class="text-right font-mono">{formatEuros(summary.totalSurcharges[index]?.runningTotal ?? 0)}</td>
                        <td><RowActions list={product.totalSurcharges} {index} reorder={(surcharges) => (product.totalSurcharges = surcharges)} onremove={() => product.removeTotalSurcharge(surcharge)} /></td>
                    </tr>
                {/each}
                <tr>
                    <td class="ghost-cell"><div class="ghost-fold"><div class="ghost-mark">+</div></div></td>
                    <td class="ghost-cell" colspan="6">
                        <div class="ghost-fold">
                            <div class="px-1 py-1.5">
                                <input
                                    class="ghost-input"
                                    placeholder="Escribe aquí para añadir un recargo (% de lo acumulado)…"
                                    oninput={(e) => addFromGhost(e.currentTarget)}
                                    aria-label="Nuevo recargo sobre el total"
                                />
                            </div>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</div>

<style lang="postcss">
    @reference '../app.css';

    /*
     * Fila fantasma para añadir un recargo: plegada a alto 0 hasta que se pasa el ratón por la tarjeta o se escribe
     * en ella. Sus celdas no llevan relleno para plegarse del todo; el relleno y la raya van dentro.
     */
    .ghost-cell {
        @apply p-0!;
    }
    .ghost-fold {
        @apply grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity] duration-200;
    }
    .total-card:hover .ghost-fold,
    .total-card:focus-within .ghost-fold {
        @apply grid-rows-[1fr] opacity-100;
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
</style>

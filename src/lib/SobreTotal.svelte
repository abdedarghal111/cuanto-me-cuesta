<!--
    @component
    «Sobre el total» del producto abierto: recargos que se aplican en orden, cada uno sobre lo acumulado.
-->

<script lang="ts">
    import Acciones from './Acciones.svelte'
    import { store } from './documentos.client.svelte.ts'
    import { emptySurcharge, formatEuros, type Product, type Summary } from './formato.ts'
    import SelectorCategoria from './SelectorCategoria.svelte'

    let { product, summary }: { product: Product; summary: Summary } = $props()

    function addSurcharge() {
        product.totalSurcharges.push(emptySurcharge())
        store.markChanged()
    }
</script>

<div class="paper overflow-hidden">
    <div class="flex items-center justify-between gap-3 border-b-2 border-ink bg-[#E8EFF8] px-4 py-2">
        <h2 class="font-hand text-[32px] leading-none font-bold text-[#183F86]">Sobre el total</h2>
        <span class="font-mono text-sm">coste {formatEuros(summary.cost)} → <strong class="text-lg">{formatEuros(summary.total)}</strong></span>
    </div>
    {#if product.totalSurcharges.length}
        <div class="overflow-x-auto" oninput={() => store.markChanged()} onchange={() => store.markChanged()}>
            <table class="w-full border-collapse text-base whitespace-nowrap [&_td]:px-1 [&_td]:py-1.5 [&_th]:px-1 [&_th]:py-1.5 [&_td+td]:border-l [&_td+td]:border-[#E3E9F0] [&_th+th]:border-l [&_th+th]:border-[#E3E9F0]">
                <thead class="bg-[#F7F9FC] text-center font-mono text-xs text-[#3F4E5D]">
                    <tr>
                        <th class="font-semibold" title="Si lo quitas, el recargo se ve pero no suma">✓</th>
                        <th class="font-semibold">Concepto</th>
                        <th class="font-semibold" title="Porcentaje de lo acumulado hasta esta línea">%</th>
                        <th class="font-semibold">Categoría</th>
                        <th class="font-semibold">Importe</th>
                        <th class="font-semibold">Acumulado</th>
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
                            <td><SelectorCategoria item={surcharge} /></td>
                            <td class="text-right font-mono font-semibold {surcharge.counts ? '' : 'line-through'}">{formatEuros(summary.totalSurcharges[index]?.amount ?? 0)}</td>
                            <td class="text-right font-mono">{formatEuros(summary.totalSurcharges[index]?.runningTotal ?? 0)}</td>
                            <td><Acciones list={product.totalSurcharges} {index} /></td>
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

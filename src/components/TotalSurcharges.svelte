<!--
    @component
    «Sobre el total» de la hoja que se ve: recargos que se aplican en orden, cada uno sobre lo acumulado, y una fila
    fantasma para añadir otro que se despliega al pasar el ratón.
-->

<script lang="ts">
    import { focusOnCreate, focusWhenCreated, liveValue } from '../fields.client.ts'
    import type { SheetView } from '../model/SheetView.ts'
    import { formatEuros } from '../model/text/numbers.ts'
    import { store } from '../store.client.svelte.ts'
    import RowActions from './RowActions.svelte'
    import TagSelect from './TagSelect.svelte'

    let { view }: { view: SheetView } = $props()

    const categories = $derived(view.categories.map((c) => c.name))

    /**
     * Crea un recargo sobre el total con lo escrito en la fila fantasma, vacía la fila y pasa el foco al concepto
     * del recargo nuevo para seguir escribiendo.
     * @param input Campo de la fila fantasma.
     */
    async function addFromGhost(input: HTMLInputElement) {
        const name = input.value
        input.value = ''
        focusWhenCreated(await store.edit({ op: 'addSurcharge', sectionId: null, name }))
    }
</script>

<div class="total-card paper overflow-hidden">
    <div class="card-header">
        <h2 class="block-title">Sobre el total</h2>
        <span class="font-mono text-sm">coste {formatEuros(view.cost)} → <strong class="text-lg">{formatEuros(view.total)}</strong></span>
    </div>
    <div class="overflow-x-auto">
        <table class="cost-table">
            {#if view.totalSurcharges.length}
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
                {#each view.totalSurcharges as surcharge (surcharge.id)}
                    <tr class="cost-row {surcharge.counts ? '' : 'opacity-45'}">
                        <td>
                            <input
                                type="checkbox"
                                class="check"
                                checked={surcharge.counts}
                                onchange={(e) => store.edit({ op: 'set', id: surcharge.id, field: 'counts', value: e.currentTarget.checked })}
                                aria-label="Cuenta"
                            />
                        </td>
                        <td class="w-full">
                            <input
                                class="concept-input"
                                {@attach liveValue(() => surcharge.name)}
                                {@attach focusOnCreate(surcharge.id)}
                                oninput={(e) => store.edit({ op: 'set', id: surcharge.id, field: 'name', value: e.currentTarget.value })}
                                placeholder="Ej. Margen"
                                aria-label="Concepto"
                                data-row={surcharge.id}
                            />
                        </td>
                        <td>
                            <input
                                class="numeric highlighted w-18"
                                {@attach liveValue(() => surcharge.percent)}
                                oninput={(e) => store.edit({ op: 'set', id: surcharge.id, field: 'percent', value: e.currentTarget.value })}
                                inputmode="decimal"
                                placeholder="0"
                                aria-label="Porcentaje"
                            />
                        </td>
                        <td><TagSelect item={surcharge} {categories} /></td>
                        <td class="amount-cell {surcharge.counts ? '' : 'line-through'}">{formatEuros(surcharge.amount)}</td>
                        <td class="text-right font-mono">{formatEuros(surcharge.runningTotal)}</td>
                        <td><RowActions id={surcharge.id} /></td>
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

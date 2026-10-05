<!--
    @component
    «Sobre el total» del producto abierto: recargos que se aplican en orden, cada uno sobre lo acumulado.
-->

<script lang="ts">
    import Acciones from './Acciones.svelte'
    import { documentos } from './documentos.client.svelte.ts'
    import { euros, recargoVacio, type Documento, type Resumen } from './formato.ts'
    import SelectorCategoria from './SelectorCategoria.svelte'

    let { doc, resumen }: { doc: Documento; resumen: Resumen } = $props()

    function añadir() {
        doc.sobreTotal.push(recargoVacio())
        documentos.cambiado()
    }
</script>

<div class="papel overflow-hidden">
    <div class="flex items-center justify-between gap-3 border-b-2 border-ink bg-[#E8EFF8] px-4 py-2">
        <h2 class="font-mano text-[32px] leading-none font-bold text-[#183F86]">Sobre el total</h2>
        <span class="font-mono text-sm">coste {euros(resumen.coste)} → <strong class="text-lg">{euros(resumen.total)}</strong></span>
    </div>
    {#if doc.sobreTotal.length}
        <div class="overflow-x-auto" oninput={() => documentos.cambiado()} onchange={() => documentos.cambiado()}>
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
                    {#each doc.sobreTotal as r, j (r)}
                        <tr class="border-t border-[#D5DEE8] even:bg-[#F7F9FC] {r.cuenta ? '' : 'opacity-45'}">
                            <td><input type="checkbox" class="size-5 accent-ink" bind:checked={r.cuenta} aria-label="Cuenta" /></td>
                            <td class="w-full">
                                <input class="sin-caja w-full min-w-24 border-b border-[#C5D1DE] py-1" bind:value={r.concepto} placeholder="Ej. Margen" aria-label="Concepto" />
                            </td>
                            <td><input class="numero usado w-18" bind:value={r.pct} inputmode="decimal" placeholder="0" aria-label="Porcentaje" /></td>
                            <td><SelectorCategoria l={r} /></td>
                            <td class="text-right font-mono font-semibold {r.cuenta ? '' : 'line-through'}">{euros(resumen.sobreTotal[j]?.importe ?? 0)}</td>
                            <td class="text-right font-mono">{euros(resumen.sobreTotal[j]?.acumulado ?? 0)}</td>
                            <td><Acciones lista={doc.sobreTotal} i={j} /></td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    {/if}
    <div class="border-t border-dashed border-[#AEBCCB] px-4 py-2">
        <button class="anadir" onclick={añadir}>+ recargo (% de lo acumulado)</button>
    </div>
</div>

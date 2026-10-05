<!--
    @component
    Un bloque del producto abierto: título editable con su subtotal y la tabla de sus líneas de gasto
    y de sus recargos sobre el bloque.
-->

<script lang="ts">
    import Acciones, { mover, quitar } from './Acciones.svelte'
    import { documentos } from './documentos.client.svelte.ts'
    import {
        TIPOS, UNIDADES_TIEMPO, aDuracion, coste, euros, lineaVacia, recargo, recargoVacio, unidadTiempo,
        type Documento, type Linea, type Resumen, type Seccion, type Tipo,
    } from './formato.ts'
    import Icono from './Icono.svelte'
    import SelectorCategoria from './SelectorCategoria.svelte'

    /** `s` es el bloque número `i` de `doc`. */
    let { doc, resumen, s, i }: { doc: Documento; resumen: Resumen; s: Seccion; i: number } = $props()

    const base = $derived(resumen.base[i] ?? 0)

    /** Nombre de cada unidad de tiempo en el desplegable. */
    const NOMBRES_TIEMPO: Record<string, string> = { d: 'días', h: 'horas', min: 'minutos' }

    /** Cambia el tipo de la línea: `fijo` pone Precio y Por a 1 y `tiempo` deja la unidad en d, h o min. */
    function elegirTipo(l: Linea, tipo: Tipo) {
        l.tipo = tipo
        if (tipo === 'fijo') {
            l.precio = '1'
            l.por = '1'
            l.unidad = l.unidad.trim() || '€'
        }
        if (tipo === 'tiempo') {
            l.unidad = unidadTiempo(l.unidad)
        }
        documentos.cambiado()
    }

    /** Añade una línea en blanco con la categoría de la última. */
    function añadirLinea() {
        s.lineas.push(lineaVacia(s.lineas.at(-1)?.tag ?? ''))
        documentos.cambiado()
    }

    /** Añade un recargo en blanco con la categoría de la última línea. */
    function añadirRecargo() {
        s.recargos.push(recargoVacio(s.lineas.at(-1)?.tag ?? ''))
        documentos.cambiado()
    }
</script>

<div class="papel overflow-hidden">
    <div class="flex items-center justify-between gap-3 border-b-2 border-ink bg-[#E8EFF8] px-4 py-2">
        <input
            class="titulo-editable min-w-0 flex-1 font-mano text-[32px] leading-none font-bold text-[#183F86]"
            bind:value={s.titulo}
            oninput={() => documentos.cambiado()}
            aria-label="Título del bloque"
        />
        <strong class="font-mono text-lg">{euros(resumen.porSeccion[i] ?? 0)}</strong>
        <span class="inline-flex">
            <button class="mini" onclick={() => mover(doc.secciones, i, -1)} title="Subir bloque" aria-label="Subir bloque"><Icono nombre="arriba" /></button>
            <button class="mini" onclick={() => mover(doc.secciones, i, 1)} title="Bajar bloque" aria-label="Bajar bloque"><Icono nombre="abajo" /></button>
            <button class="mini" onclick={() => quitar(doc.secciones, i, `Quitar el bloque «${s.titulo}»`)} title="Quitar bloque" aria-label="Quitar bloque"><Icono nombre="quitar" /></button>
        </span>
    </div>
    <div class="overflow-x-auto" oninput={() => documentos.cambiado()} onchange={() => documentos.cambiado()}>
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
                {#each s.lineas as l, j (l)}
                    <tr class="border-t border-[#D5DEE8] even:bg-[#F7F9FC] {l.cuenta ? '' : 'opacity-45'}">
                        <td><input type="checkbox" class="size-5 accent-ink" bind:checked={l.cuenta} aria-label="Cuenta" /></td>
                        <td class="w-full">
                            <input class="sin-caja w-full min-w-24 border-b border-[#C5D1DE] py-1" bind:value={l.concepto} placeholder="Ej. Filamento PLA" aria-label="Concepto" />
                        </td>
                        <td>
                            <select class="cursor-pointer font-mono text-sm" value={l.tipo} onchange={(e) => elegirTipo(l, e.currentTarget.value as Tipo)} aria-label="Tipo">
                                {#each Object.entries(TIPOS) as [valor, nombre] (valor)}<option value={valor}>{nombre}</option>{/each}
                            </select>
                        </td>
                        {#if l.tipo === 'fijo'}
                            <td><input class="numero w-20" value="1" disabled aria-label="Precio €" /></td>
                            <td><input class="numero w-16" value="1" disabled aria-label="Por" /></td>
                        {:else}
                            <td><input class="numero w-20" bind:value={l.precio} inputmode="decimal" placeholder="0" aria-label="Precio €" /></td>
                            <td><input class="numero w-16" bind:value={l.por} inputmode="decimal" placeholder="1" aria-label="Por" /></td>
                        {/if}
                        <td>
                            {#if l.tipo === 'tiempo'}
                                <select class="w-24 cursor-pointer font-mono text-sm" bind:value={l.unidad} aria-label="Unidad">
                                    {#each Object.keys(UNIDADES_TIEMPO) as u (u)}<option value={u}>{NOMBRES_TIEMPO[u]}</option>{/each}
                                </select>
                            {:else}
                                <input class="w-24 font-mono text-sm" bind:value={l.unidad} placeholder="g, m…" aria-label="Unidad" />
                            {/if}
                        </td>
                        <td>
                            {#if l.tipo === 'tiempo'}
                                <input
                                    class="numero usado w-24"
                                    bind:value={l.consumo}
                                    onchange={() => (l.consumo = aDuracion(l.consumo, l.unidad))}
                                    placeholder="3d 5h 1m"
                                    title="Duración: 3d 5h 1m 3s, 15:08 (horas:minutos) o un número en la unidad"
                                    aria-label="Consumo"
                                />
                            {:else}
                                <input class="numero usado w-24" bind:value={l.consumo} inputmode="decimal" placeholder={l.tipo === 'fijo' ? '0,00 €' : '0'} aria-label="Consumo" />
                            {/if}
                        </td>
                        <td><input class="numero w-12" bind:value={l.multiplicador} inputmode="decimal" placeholder="1" aria-label="Multiplicador" /></td>
                        <td><SelectorCategoria {l} /></td>
                        <td class="text-right font-mono font-semibold {l.cuenta ? '' : 'line-through'}">{euros(coste(l))}</td>
                        <td><Acciones lista={s.lineas} i={j} /></td>
                    </tr>
                {/each}
                {#if s.recargos.length}
                    <tr class="border-t-2 border-dashed border-[#AEBCCB] bg-[#E8EFF8]">
                        <td colspan="11" class="font-mono text-xs text-[#3F4E5D]">
                            Recargos sobre el bloque · base {euros(base)}
                        </td>
                    </tr>
                {/if}
                {#each s.recargos as r, j (r)}
                    <tr class="border-t border-[#D5DEE8] even:bg-[#F7F9FC] {r.cuenta ? '' : 'opacity-45'}">
                        <td><input type="checkbox" class="size-5 accent-ink" bind:checked={r.cuenta} aria-label="Cuenta" /></td>
                        <td class="w-full">
                            <input class="sin-caja w-full min-w-24 border-b border-[#C5D1DE] py-1" bind:value={r.concepto} placeholder="Ej. Riesgo por fallos" aria-label="Concepto" />
                        </td>
                        <td colspan="6">
                            <span class="inline-flex items-center gap-1">
                                <input class="numero usado w-18" bind:value={r.pct} inputmode="decimal" placeholder="0" aria-label="Porcentaje" />
                                <span class="font-mono text-[13px] text-[#3F4E5D]">% de la base</span>
                            </span>
                        </td>
                        <td><SelectorCategoria l={r} /></td>
                        <td class="text-right font-mono font-semibold {r.cuenta ? '' : 'line-through'}">{euros(recargo(r, base))}</td>
                        <td><Acciones lista={s.recargos} i={j} /></td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
    <div class="flex gap-5 border-t border-dashed border-[#AEBCCB] px-4 py-2">
        <button class="anadir" onclick={añadirLinea}>+ línea</button>
        <button class="anadir" onclick={añadirRecargo}>+ recargo (% del bloque)</button>
    </div>
</div>

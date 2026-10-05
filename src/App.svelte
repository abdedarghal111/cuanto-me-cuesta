<!--
    @component
    Aplicación: pestañas de productos, edición de un producto (ficha, bloques y «Sobre el total») con su
    resumen, y vista «Todo» con el gasto de todos los productos. Los datos viven en `store`.
-->

<script lang="ts">
    import { onMount } from 'svelte'
    import { store, clone } from './lib/documentos.client.svelte.ts'
    import Bloque from './lib/Bloque.svelte'
    import { tagSegments } from './lib/colores.ts'
    import Dialogo from './lib/Dialogo.svelte'
    import DondeSeVa from './lib/DondeSeVa.svelte'
    import { emptyLine, formatEuros, type Section } from './lib/formato.ts'
    import Pestanas from './lib/Pestanas.svelte'
    import Producto from './lib/Producto.svelte'
    import SobreTotal from './lib/SobreTotal.svelte'
    import TextoArchivo from './lib/TextoArchivo.svelte'
    import Todo from './lib/Todo.svelte'

    onMount(() => {
        // Un «#archivo.txt» en la dirección abre ese producto.
        store.reload().then(() => {
            const hash = decodeURIComponent(location.hash.slice(1))
            if (store.files.includes(hash)) {
                store.selected = hash
            }
        })
        // Al volver a la ventana se releen los archivos, por si se han editado a mano.
        const onFocus = () => store.reload()
        const onKeydown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault()
                store.saveAll()
            }
        }
        // Aviso del navegador al cerrar o recargar con cambios sin guardar.
        const onBeforeUnload = (e: BeforeUnloadEvent) => {
            if (!store.hasUnsaved) {
                return
            }
            e.preventDefault()
            e.returnValue = ''
        }
        window.addEventListener('focus', onFocus)
        window.addEventListener('keydown', onKeydown)
        window.addEventListener('beforeunload', onBeforeUnload)
        return () => {
            window.removeEventListener('focus', onFocus)
            window.removeEventListener('keydown', onKeydown)
            window.removeEventListener('beforeunload', onBeforeUnload)
        }
    })

    /** Añade un bloque en blanco o una copia del de la plantilla elegido (valor: índice del bloque). */
    function addSection(e: Event & { currentTarget: HTMLSelectElement }) {
        if (!store.product) {
            return
        }
        const value = e.currentTarget.value
        e.currentTarget.value = ''
        const templateSection = store.template.sections[Number(value)]
        const section: Section = value === 'empty' || !templateSection
            ? { title: 'Nuevo bloque', lines: [emptyLine()], surcharges: [] }
            : clone(templateSection)
        store.product.sections.push(section)
        ;[...section.lines, ...section.surcharges].forEach((item) => store.ensureTag(item.tag))
        store.markChanged()
    }
</script>

<Dialogo />
<Pestanas />

<main class="mx-auto flex max-w-[1500px] flex-wrap items-start gap-6 p-6">
    {#if store.product && store.summary}
        {@const product = store.product}
        {@const summary = store.summary}
        <section class="flex min-w-0 flex-[999_1_680px] flex-col gap-[18px]">
            <Producto {product} />

            {#if store.textMode}
                <TextoArchivo {product} />
            {:else}
                {#each product.sections as section, index (section)}
                    <Bloque {product} {summary} {section} {index} />
                {/each}

                <select class="cursor-pointer self-start text-accent rounded-md border-2 border-dashed border-[#1F4FA8] bg-white px-4 py-2 font-hand text-[26px] font-bold" onchange={addSection} aria-label="Nuevo bloque">
                    <option value="" selected disabled>+ nuevo bloque…</option>
                    <option value="empty">Bloque en blanco</option>
                    {#each store.template.sections as templateSection, i (i)}<option value={i}>{templateSection.title}</option>{/each}
                </select>

                <SobreTotal {product} {summary} />

                <p class="paper-soft">
                    Coste = Precio / por × consumo × multiplicador. Solo números con coma (<code>0,5</code>). El tipo dice cómo se escriben «por» y «consumo»: número, tiempo (unidad en días, horas o minutos y consumo como duración: <code>3d 5h 1m 3s</code>) o fijo (el consumo es un importe en €).
                    Los recargos de un bloque son un % de la suma de sus líneas y se suman entre sí; los de «Sobre el total» se aplican en orden, cada uno sobre lo acumulado.
                    Los bloques de «+ nuevo bloque» y los de un producto nuevo salen de la plantilla, <code>src/res/template.txt</code>.
                </p>
            {/if}
        </section>

        <aside class="sticky top-[90px] flex flex-[1_1_300px] flex-col gap-[18px] max-w-[360px]">
            <div class="note-card">
                <span class="font-hand text-[26px] font-bold">Me ha costado</span>
                <span class="font-hand text-[72px] leading-none font-bold text-[#B4161D]">{formatEuros(summary.cost)}</span>
                {#if summary.total !== summary.cost}<span class="font-bold">Con lo de sobre el total: {formatEuros(summary.total)}</span>{/if}
                {#if summary.excluded > 0}<span class="text-sm">+ {formatEuros(summary.excluded)} que no cuentan</span>{/if}
            </div>
            <DondeSeVa segments={tagSegments(summary.byTag, store.tags)} total={summary.total} />
            <div class="paper grid gap-1 p-4">
                <h2 class="mb-1 font-hand text-[26px] leading-none">Por bloques</h2>
                {#each product.sections as section, index (section)}
                    <div class="flex justify-between gap-2 border-b border-[#EEF2F6] py-0.5">
                        <span class="truncate">{section.title}</span><span class="font-mono text-sm font-semibold">{formatEuros(summary.sectionSubtotals[index] ?? 0)}</span>
                    </div>
                {/each}
            </div>
        </aside>
    {:else}
        <Todo />
    {/if}
</main>

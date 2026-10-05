<!--
    @component
    Aplicación: pestañas de productos, edición de un producto (ficha, bloques y «Sobre el total») con su
    resumen, y vista «Todo» con el gasto de todos los productos. Los datos viven en `documentos`.
-->

<script lang="ts">
    import { onMount } from 'svelte'
    import { documentos, copia } from './lib/documentos.client.svelte.ts'
    import Bloque from './lib/Bloque.svelte'
    import { segmentos } from './lib/colores.ts'
    import Dialogo from './lib/Dialogo.svelte'
    import DondeSeVa from './lib/DondeSeVa.svelte'
    import { euros, lineaVacia } from './lib/formato.ts'
    import Pestanas from './lib/Pestanas.svelte'
    import Producto from './lib/Producto.svelte'
    import SobreTotal from './lib/SobreTotal.svelte'
    import TextoArchivo from './lib/TextoArchivo.svelte'
    import Todo from './lib/Todo.svelte'

    onMount(() => {
        // Un «#archivo.txt» en la dirección abre ese producto.
        documentos.recargar().then(() => {
            const h = decodeURIComponent(location.hash.slice(1))
            if (documentos.archivos.includes(h)) {
                documentos.sel = h
            }
        })
        // Al volver a la ventana se releen los archivos, por si se han editado a mano.
        const alVolver = () => documentos.recargar()
        const teclas = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault()
                documentos.guardarTodo()
            }
        }
        // Aviso del navegador al cerrar o recargar con cambios sin guardar.
        const alCerrar = (e: BeforeUnloadEvent) => {
            if (!documentos.haySucios) {
                return
            }
            e.preventDefault()
            e.returnValue = ''
        }
        window.addEventListener('focus', alVolver)
        window.addEventListener('keydown', teclas)
        window.addEventListener('beforeunload', alCerrar)
        return () => {
            window.removeEventListener('focus', alVolver)
            window.removeEventListener('keydown', teclas)
            window.removeEventListener('beforeunload', alCerrar)
        }
    })

    /** Añade un bloque en blanco o una copia del de la plantilla elegido (valor: índice del bloque). */
    function añadirBloque(e: Event & { currentTarget: HTMLSelectElement }) {
        if (!documentos.doc) {
            return
        }
        const v = e.currentTarget.value
        e.currentTarget.value = ''
        const p = documentos.plantilla.secciones[Number(v)]
        const nueva = v === 'vacio' || !p ? { titulo: 'Nuevo bloque', lineas: [lineaVacia()], recargos: [] } : copia(p)
        documentos.doc.secciones.push(nueva)
        ;[...nueva.lineas, ...nueva.recargos].forEach((l) => documentos.asegurarTag(l.tag))
        documentos.cambiado()
    }
</script>

<Dialogo />
<Pestanas />

<main class="mx-auto flex max-w-[1500px] flex-wrap items-start gap-6 p-6">
    {#if documentos.doc && documentos.resumen}
        {@const doc = documentos.doc}
        {@const resumen = documentos.resumen}
        <section class="flex min-w-0 flex-[999_1_680px] flex-col gap-[18px]">
            <Producto {doc} />

            {#if documentos.modoTexto}
                <TextoArchivo {doc} />
            {:else}
                {#each doc.secciones as s, i (s)}
                    <Bloque {doc} {resumen} {s} {i} />
                {/each}

                <select class="cursor-pointer self-start text-accent rounded-md border-2 border-dashed border-[#1F4FA8] bg-white px-4 py-2 font-mano text-[26px] font-bold" onchange={añadirBloque} aria-label="Nuevo bloque">
                    <option value="" selected disabled>+ nuevo bloque…</option>
                    <option value="vacio">Bloque en blanco</option>
                    {#each documentos.plantilla.secciones as p, pi (pi)}<option value={pi}>{p.titulo}</option>{/each}
                </select>

                <SobreTotal {doc} {resumen} />

                <p class="papel-suave">
                    Coste = Precio / por × consumo × multiplicador. Solo números con coma (<code>0,5</code>). El tipo dice cómo se escriben «por» y «consumo»: número, tiempo (unidad en días, horas o minutos y consumo como duración: <code>3d 5h 1m 3s</code>) o fijo (el consumo es un importe en €).
                    Los recargos de un bloque son un % de la suma de sus líneas y se suman entre sí; los de «Sobre el total» se aplican en orden, cada uno sobre lo acumulado.
                    Los bloques de «+ nuevo bloque» y los de un producto nuevo salen de la plantilla, <code>src/res/template.txt</code>.
                </p>
            {/if}
        </section>

        <aside class="sticky top-[90px] flex flex-[1_1_300px] flex-col gap-[18px] max-w-[360px]">
            <div class="postit">
                <span class="font-mano text-[26px] font-bold">Me ha costado</span>
                <span class="font-mano text-[72px] leading-none font-bold text-[#B4161D]">{euros(resumen.coste)}</span>
                {#if resumen.total !== resumen.coste}<span class="font-bold">Con lo de sobre el total: {euros(resumen.total)}</span>{/if}
                {#if resumen.sinContar > 0}<span class="text-sm">+ {euros(resumen.sinContar)} que no cuentan</span>{/if}
            </div>
            <DondeSeVa segmentos={segmentos(resumen.porTag, documentos.tags)} total={resumen.total} />
            <div class="papel grid gap-1 p-4">
                <h2 class="mb-1 font-mano text-[26px] leading-none">Por bloques</h2>
                {#each doc.secciones as s, i (s)}
                    <div class="flex justify-between gap-2 border-b border-[#EEF2F6] py-0.5">
                        <span class="truncate">{s.titulo}</span><span class="font-mono text-sm font-semibold">{euros(resumen.porSeccion[i] ?? 0)}</span>
                    </div>
                {/each}
            </div>
        </aside>
    {:else}
        <Todo />
    {/if}
</main>

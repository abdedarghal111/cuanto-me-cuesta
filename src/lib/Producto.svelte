<!--
    @component
    Ficha del producto abierto: nombre, fecha, acciones (ver texto, clonar, descartar, borrar),
    descripción y categorías con lo que suma cada una.
-->

<script lang="ts">
    import { documentos } from './documentos.client.svelte.ts'
    import { colorDe, suave } from './colores.ts'
    import { preguntar } from './Dialogo.svelte'
    import { euros, type Documento } from './formato.ts'
    import Icono from './Icono.svelte'
    import { pedirCategoria } from './SelectorCategoria.svelte'

    let { doc }: { doc: Documento } = $props()

    async function clonar() {
        const producto = await preguntar({ titulo: 'Clonar producto', mensaje: '¿Cómo se llama?', valor: `${doc.producto} (copia)`, aceptar: 'Clonar' })
        if (producto) {
            documentos.crear(producto, doc)
        }
    }

    async function descartar() {
        const si = await preguntar({
            titulo: 'Descartar cambios',
            mensaje: 'Se vuelve a lo que hay guardado en el archivo y se pierde lo que no has guardado.',
            aceptar: 'Descartar',
            peligro: true,
        })
        if (si) {
            await documentos.descartar()
        }
    }

    async function borrar() {
        const si = await preguntar({
            titulo: `Borrar «${doc.producto}»`,
            mensaje: `El archivo se queda como datos/${documentos.sel}.borrado, por si acaso.`,
            aceptar: 'Borrar',
            peligro: true,
        })
        if (si) {
            await documentos.borrar()
        }
    }

    async function añadirTag() {
        const t = await pedirCategoria()
        if (!t) {
            return
        }
        documentos.asegurarTag(t)
        documentos.cambiado()
    }

    /** Líneas y recargos del producto que usan la categoría, y lo que suman. */
    const usoTag = (tag: string) => {
        const todas = [...doc.secciones.flatMap((s) => [...s.lineas, ...s.recargos]), ...doc.sobreTotal]
        return { lineas: todas.filter((l) => l.tag.trim() === tag), coste: documentos.resumen?.porTag.get(tag) ?? 0 }
    }

    async function quitarTag(tag: string) {
        const { lineas } = usoTag(tag)
        if (lineas.length) {
            const si = await preguntar({
                titulo: `Quitar la categoría «${tag}»`,
                mensaje: `${lineas.length === 1 ? 'Una línea la usa y se quedará' : `${lineas.length} líneas la usan y se quedarán`} sin categoría.`,
                aceptar: 'Quitar',
                peligro: true,
            })
            if (!si) {
                return
            }
            lineas.forEach((l) => (l.tag = ''))
        }
        doc.tags = doc.tags.filter((t) => t !== tag)
        documentos.cambiado()
    }
</script>

<div class="papel grid gap-2.5 px-5 py-[18px]">
    <div class="flex flex-wrap items-end justify-between gap-3">
        <input
            class="titulo-editable min-w-0 flex-[1_1_300px] font-mano text-[50px] leading-none font-bold"
            bind:value={doc.producto}
            oninput={() => documentos.cambiado()}
            aria-label="Nombre del producto"
        />
        <div class="flex flex-wrap items-center gap-4 text-base">
            <input type="date" class="font-mono text-sm" bind:value={doc.fecha} onchange={() => documentos.cambiado()} aria-label="Fecha" />
            <button class="enlace" class:font-bold={documentos.modoTexto} onclick={() => (documentos.modoTexto = true)}>ver texto</button>
            <button class="enlace" onclick={clonar}>clonar</button>
            {#if documentos.sucios[documentos.sel]}<button class="enlace" onclick={descartar}>descartar cambios</button>{/if}
            <button class="enlace text-bad" onclick={borrar}>borrar</button>
        </div>
    </div>
    <span class="font-mono text-xs text-muted">datos/{documentos.sel}</span>
    <label class="grid gap-1 font-bold">
        Descripción
        <textarea
            class="resize-y rounded border border-[#E6D77A] bg-[#FFFBE0] px-3 py-2 text-[17px] leading-normal font-normal"
            bind:value={doc.descripcion}
            oninput={() => documentos.cambiado()}
            rows="3"
            placeholder="Anotaciones para todo el documento: para quién es, qué se reaprovechó, qué falta por saber…"
        ></textarea>
    </label>
    <div class="grid gap-1.5">
        <span class="font-bold">Categorías de este documento</span>
        <div class="flex flex-wrap items-center gap-2">
            {#each doc.tags as t (t)}
                {@const color = colorDe(t, documentos.tags)}
                {@const uso = usoTag(t)}
                <span
                    class="inline-flex items-center gap-1.5 rounded-[3px] border py-0.5 pr-1 pl-2.5 text-[15px]"
                    style:background={suave(color)}
                    style:border-color={color}
                    title="{uso.lineas.length} líneas"
                >
                    {t}
                    <span class="font-mono text-xs text-muted">{euros(uso.coste)}</span>
                    <button class="mini px-0.5" onclick={() => quitarTag(t)} aria-label="Quitar la categoría {t}" title="Quitar categoría">
                        <Icono nombre="quitar" tam={14} />
                    </button>
                </span>
            {:else}
                <span class="text-muted">Ninguna todavía.</span>
            {/each}
            <button class="enlace text-[15px]" onclick={añadirTag}>+ añadir categoría</button>
        </div>
    </div>
</div>

<!--
    @component
    Icono SVG de trazo (24×24, línea de 2 px, `currentColor`), elegido por nombre.
-->

<script lang="ts" module>
    /** Trazos SVG de 24×24 con línea de 2 px y sin relleno, por nombre de icono. */
    const FORMAS = {
        arriba: 'M12 19V5M5 12l7-7 7 7',
        abajo: 'M12 5v14M5 12l7 7 7-7',
        quitar: 'M6 6l12 12M18 6L6 18',
        guardar: 'M5 3h11l3 3v15H5zM8 3v6h8V3M8 21v-7h8v7',
    }
    export type NombreIcono = keyof typeof FORMAS
</script>

<script lang="ts">
    let { nombre, tam = 18 }: { nombre: NombreIcono; tam?: number } = $props()
</script>

<svg
    width={tam}
    height={tam}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
>
    <path d={FORMAS[nombre]} />
</svg>

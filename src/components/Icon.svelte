<!--
    @component
    Icono SVG de trazo (24×24, línea de 2 px, `currentColor`), elegido por nombre.
-->

<script lang="ts" module>
    /** Trazos SVG de 24×24 con línea de 2 px y sin relleno, por nombre de icono. */
    const ICON_PATHS = {
        up: 'M12 19V5M5 12l7-7 7 7',
        down: 'M12 5v14M5 12l7 7 7-7',
        remove: 'M6 6l12 12M18 6L6 18',
        save: 'M5 3h11l3 3v15H5zM8 3v6h8V3M8 21v-7h8v7',
    }
    export type IconName = keyof typeof ICON_PATHS
</script>

<script lang="ts">
    let { name, size = 18 }: { name: IconName; size?: number } = $props()
</script>

<svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
>
    <path d={ICON_PATHS[name]} />
</svg>

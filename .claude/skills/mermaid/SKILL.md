---
name: mermaid
description: Diagramas de clases UML en Mermaid, en versión simple o completa, y cómo validarlos. Úsala siempre que vayas a escribir o cambiar un diagrama UML.
---

# Diagramas UML en Mermaid

## Versión simple

Solo las piezas y cómo se relacionan:

```
classDiagram
    class Product
    class Section
    Product *-- Section
```

## Versión completa

Cada clase con su tipo, atributos y métodos, y relaciones con multiplicidad:

```
classDiagram
    class Product {
        <<interface>>
        +name : string
        +sections : Section[]
    }
    class parserTs["parser.ts"] {
        <<module>>
        +parseProduct(text: string) Product$
        ~parseLine(values: RowValues) Line$
    }
    Product "1" *-- "0..*" Section : sections
    parserTs ..> Product : «create»
```

- Miembros dentro de llaves, uno por línea: atributo `+nombre : Tipo`, método `+nombre(param: Tipo) TipoDevuelto`.
- Visibilidad: `+` público, `-` privado, `#` protegido, `~` paquete.
- `$` al final = estático (subrayado), `*` al final = abstracto (cursiva).
- Tipo de pieza dentro del cuerpo: `<<interface>>`, `<<abstract>>`, `<<enumeration>>`, `<<module>>`…
- Genéricos con virgulillas: `Promise~void~`, `Record~string, number~`.
- Objetos literales (`{ … }`) como `object`, con su forma en una nota: `note for A "texto"`.

Relaciones: `<|--` herencia, `<|..` realización, `*--` composición, `o--` agregación, `-->` asociación, `..>` dependencia.

## Página HTML navegable

Cuando el usuario pida los diagramas en una página HTML, cada uno va en su recuadro con zoom y arrastre:

```html
<style>
    .diagram { height: 78vh; overflow: hidden; border: 1px solid #c5d1de; border-radius: 4px; background: #fafcfe; cursor: grab; }
    .diagram:active { cursor: grabbing; }
    .diagram pre { margin: 0; height: 100%; }
    .diagram svg { display: block; width: 100%; height: 100%; max-width: none !important; }
</style>

<div class="diagram">
<pre class="mermaid">
classDiagram
    class Product {
        &lt;&lt;interface&gt;&gt;
    }
</pre>
</div>

<script src="https://cdn.jsdelivr.net/npm/svg-pan-zoom@3.6.2/dist/svg-pan-zoom.min.js"></script>
<script type="module">
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs'
    mermaid.initialize({ startOnLoad: false, class: { useMaxWidth: false } })
    await mermaid.run({ querySelector: '.mermaid' })

    // Zoom con la rueda y arrastre en cada diagrama, ajustado al recuadro al empezar.
    const panZooms = [...document.querySelectorAll('.diagram svg')].map((svg) => {
        svg.removeAttribute('width')
        svg.removeAttribute('height')
        return svgPanZoom(svg, { controlIconsEnabled: true, fit: true, center: true, minZoom: 0.1, maxZoom: 20, zoomScaleSensitivity: 0.3 })
    })
    window.addEventListener('resize', () => panZooms.forEach((p) => { p.resize(); p.fit(); p.center() }))
</script>
```

- El `<pre>` ocupa todo el alto del recuadro (`height: 100%`, `margin: 0`); así el diagrama se ve entero.
- Mermaid se ejecuta con `mermaid.run()` y después se activa el zoom, cuando los diagramas ya están dibujados.
- Dentro del HTML, los estereotipos se escriben con entidades: `&lt;&lt;interface&gt;&gt;`.
- La leyenda de la página explica cómo navegar: rueda para ampliar, arrastrar para moverse, doble clic para acercar y botones `+`, `−` y `reset`.

## Comprobar

Valida con el parser real de Mermaid, instalado en una carpeta temporal:

```sh
T=<carpeta temporal>/mermaid-check
mkdir -p "$T" && cp .claude/skills/mermaid/validate.mjs "$T"/
(cd "$T" && echo '{"private":true}' > package.json && npm i mermaid@11 jsdom)
node "$T"/validate.mjs draftDiagrams.html   # .html, .md o .mmd
```

Corrige y repite hasta que cada diagrama dé `OK`.

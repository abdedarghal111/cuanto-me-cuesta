/**
 * @file Valida diagramas Mermaid con el parser real de Mermaid: los bloques `<pre class="mermaid">` de un `.html`,
 * los bloques ```mermaid de un `.md` o un `.mmd` entero. Uso: `node validate.mjs <archivo>`.
 * Necesita `mermaid` y `jsdom` instalados junto a este script, en una carpeta temporal (ver SKILL.md).
 */

import fs from 'node:fs'
import { JSDOM } from 'jsdom'

// Mermaid necesita un DOM para cargarse, aunque solo se use su parser.
const dom = new JSDOM('<!doctype html><body></body>')
globalThis.window = dom.window
globalThis.document = dom.window.document
globalThis.DOMParser = dom.window.DOMParser
const { default: mermaid } = await import('mermaid')
mermaid.initialize({ startOnLoad: false })

const file = process.argv[2]
const text = fs.readFileSync(file, 'utf8')

/** Código de cada diagrama del archivo. */
function blocksOf(name, content) {
    if (name.endsWith('.html')) {
        return [...new JSDOM(content).window.document.querySelectorAll('pre.mermaid')].map((pre) => pre.textContent)
    }
    if (name.endsWith('.md')) {
        return [...content.matchAll(/```mermaid\r?\n([\s\S]*?)```/g)].map((m) => m[1])
    }
    return [content]
}

let failed = 0
for (const [i, code] of blocksOf(file, text).entries()) {
    try {
        await mermaid.parse(code)
        console.log(`diagrama ${i + 1}: OK`)
    } catch (e) {
        failed++
        console.log(`diagrama ${i + 1}: ERROR\n${String(e.message ?? e).split('\n').slice(0, 6).join('\n')}`)
    }
}
process.exit(failed ? 1 : 0)

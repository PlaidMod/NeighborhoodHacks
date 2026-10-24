import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Every declaration in a stylesheet that sits outside all @layer blocks, as "selector { property }".
 * A small brace scanner: enough for globals.css, which has no strings containing braces.
 */
function unlayeredDeclarations(css: string): string[] {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const found: string[] = []
  const headers: string[] = []
  let text = ''
  for (const ch of src) {
    if (ch === '{') {
      headers.push(text.split(';').pop()!.trim())
      text = ''
    } else if (ch === '}') {
      const header = headers.pop() ?? ''
      if (![...headers, header].some((h) => h.startsWith('@layer'))) {
        for (const decl of text.split(';')) {
          const colon = decl.indexOf(':')
          if (colon > 0) found.push(`${header} { ${decl.slice(0, colon).trim()} }`)
        }
      }
      text = ''
    } else {
      text += ch
    }
  }
  return found
}

describe('globals.css cascade layers', () => {
  const css = readFileSync(join(process.cwd(), 'app', 'globals.css'), 'utf8')

  it('the scanner finds unlayered declarations and skips layered ones', () => {
    const sample = '@layer base { a { color: red; } } .x { box-shadow: none; } @media (hover: hover) { .y { border: 0; } }'
    expect(unlayeredDeclarations(sample)).toEqual(['.x { box-shadow }', '.y { border }'])
  })

  // Tailwind's utilities live in @layer utilities. An unlayered rule beats every layer, so an
  // unlayered box-shadow erases focus rings (focus-visible:ring-*), an unlayered border erases
  // border-0, and an unlayered background erases hover tints (hover:bg-*).
  it('no unlayered rule sets box-shadow, border, outline or background, so utilities still apply', () => {
    const blocked = /^(box-shadow|border(-[a-z-]+)?|outline(-[a-z-]+)?|background(-color|-image)?|backdrop-filter|-webkit-backdrop-filter)$/
    const offenders = unlayeredDeclarations(css).filter((d) => blocked.test(d.slice(d.lastIndexOf('{') + 1, -1).trim()))
    expect(offenders).toEqual([])
  })
})

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

type Tree = { [key: string]: string | Tree }

function load(locale: string): Tree {
  return JSON.parse(readFileSync(join(process.cwd(), 'messages', `${locale}.json`), 'utf8'))
}

/** Flattens nested messages into { 'Home.title': 'text', ... }. */
function flatten(tree: Tree, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'string') out[path] = value
    else Object.assign(out, flatten(value, path))
  }
  return out
}

/** ICU argument names, e.g. "{count, plural, ...}" and "{name}" give ["count", "name"]. */
function placeholders(message: string): string[] {
  return [...new Set([...message.matchAll(/\{\s*([A-Za-z_]\w*)\s*[,}]/g)].map((m) => m[1]))].sort()
}

describe('message files', () => {
  const en = flatten(load('en'))
  const es = flatten(load('es'))

  it('en and es have the same keys', () => {
    expect(Object.keys(en).filter((k) => !(k in es)), 'missing in es.json').toEqual([])
    expect(Object.keys(es).filter((k) => !(k in en)), 'missing in en.json').toEqual([])
  })

  it('no message is empty', () => {
    const empty = [...Object.entries(en), ...Object.entries(es)].filter(([, v]) => v.trim() === '')
    expect(empty.map(([k]) => k)).toEqual([])
  })

  it('placeholders match between languages', () => {
    const mismatched = Object.keys(en).filter(
      (k) => k in es && placeholders(en[k]).join() !== placeholders(es[k]).join(),
    )
    expect(mismatched).toEqual([])
  })
})

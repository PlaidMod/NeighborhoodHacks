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

  it('the privacy page says the address goes to the U.S. Census Bureau', () => {
    expect(en['Legal.privacy.address.body']).toMatch(/Census Bureau/)
    expect(en['Legal.privacy.processors.body']).toMatch(/Census Bureau/)
    expect(es['Legal.privacy.address.body']).toMatch(/Oficina del Censo/)
    expect(es['Legal.privacy.processors.body']).toMatch(/Oficina del Censo/)
  })

  it('the privacy page explains Google sign-in and keeps the saved address browser-only', () => {
    expect(en['Legal.privacy.account.body']).toMatch(/Google/)
    expect(en['Legal.privacy.account.body']).toMatch(/email address/)
    expect(en['Legal.privacy.account.body']).toMatch(/stays only in this browser/)
    expect(en['Legal.privacy.account.body']).toMatch(/never added to your account/)
    expect(en['Legal.privacy.account.body']).toMatch(/delete your account/)
    expect(es['Legal.privacy.account.body']).toMatch(/Google/)
    expect(es['Legal.privacy.account.body']).toMatch(/correo electrónico/)
    expect(es['Legal.privacy.account.body']).toMatch(/se queda solo en este navegador/)
    expect(es['Legal.privacy.account.body']).toMatch(/nunca se agrega a tu cuenta/)
    expect(es['Legal.privacy.account.body']).toMatch(/eliminar tu cuenta/)
    expect(en['Legal.privacy.processors.body']).toMatch(/Google \(sign-in/)
    expect(es['Legal.privacy.processors.body']).toMatch(/Google \(inicio de sesión/)
    expect(en['Legal.privacy.cookies.body']).not.toMatch(/Team admins also get/)
  })

  it('placeholders match between languages', () => {
    const mismatched = Object.keys(en).filter(
      (k) => k in es && placeholders(en[k]).join() !== placeholders(es[k]).join(),
    )
    expect(mismatched).toEqual([])
  })
})

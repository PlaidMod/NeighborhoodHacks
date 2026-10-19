import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Static checks on every migration, including the ones teammates add later.
// The database itself is verified with SQL after each migration is applied.
const DIR = join(process.cwd(), 'supabase', 'migrations')

function loadSql(): { file: string; sql: string }[] {
  return readdirSync(DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((file) => ({ file, sql: stripComments(readFileSync(join(DIR, file), 'utf8')) }))
}

function stripComments(sql: string): string {
  return sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--[^\n]*/g, '')
}

function names(sql: string, pattern: RegExp): Set<string> {
  const found = new Set<string>()
  for (const m of sql.matchAll(pattern)) found.add(m[1].toLowerCase())
  return found
}

const TABLE = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?"?(\w+)"?/gi
const RLS = /alter\s+table\s+(?:only\s+)?(?:if\s+exists\s+)?(?:public\.)?"?(\w+)"?\s+enable\s+row\s+level\s+security/gi

describe('supabase migrations', () => {
  it('has at least one migration file', () => {
    expect(loadSql().length).toBeGreaterThan(0)
  })

  it('every created table enables RLS', () => {
    const all = loadSql().map((m) => m.sql).join('\n')
    const tables = names(all, TABLE)
    const secured = names(all, RLS)
    expect([...tables].filter((t) => !secured.has(t))).toEqual([])
  })

  it('no migration creates a policy', () => {
    for (const { file, sql } of loadSql()) {
      expect(/create\s+policy/i.test(sql), file).toBe(false)
    }
  })

  it('no migration grants to anon', () => {
    for (const { file, sql } of loadSql()) {
      expect(/grant\s+[^;]*\bto\s+anon\b/i.test(sql), file).toBe(false)
    }
  })

  it('every view uses security_invoker', () => {
    for (const { file, sql } of loadSql()) {
      for (const stmt of sql.split(';')) {
        if (/create\s+(?:or\s+replace\s+)?view\b/i.test(stmt)) {
          expect(/security_invoker\s*=\s*(?:true|on)/i.test(stmt), `${file}: ${stmt.trim().slice(0, 60)}`).toBe(true)
        }
      }
    }
  })
})

describe('supabase migration functions', () => {
  const FUNCTION = /create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?"?(\w+)"?\s*\(([^)]*)\)/gi

  it('every created function is security invoker and revokes execute from public, anon and authenticated', () => {
    const all = loadSql().map((m) => m.sql).join('\n')
    const problems: string[] = []
    for (const match of all.matchAll(FUNCTION)) {
      const name = match[1]
      const body = all.slice(match.index, all.indexOf('$$;', match.index) + 3)
      if (!/security\s+invoker/i.test(body)) problems.push(`${name}: not security invoker`)
      const revoke = new RegExp(String.raw`revoke\s+execute\s+on\s+function\s+(?:public\.)?${name}\b[^;]*from\s+([^;]*);`, 'i')
      const from = all.match(revoke)?.[1].toLowerCase() ?? ''
      for (const role of ['public', 'anon', 'authenticated']) {
        if (!from.includes(role)) problems.push(`${name}: execute not revoked from ${role}`)
      }
    }
    expect(problems).toEqual([])
  })
})

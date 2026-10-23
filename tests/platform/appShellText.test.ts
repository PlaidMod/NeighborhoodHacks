import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

type Tree = { [key: string]: string | Tree }

const read = (...parts: string[]) => readFileSync(join(process.cwd(), ...parts), 'utf8')
const flatten = (tree: Tree, prefix = ''): Record<string, string> =>
  Object.fromEntries(
    Object.entries(tree).flatMap(([key, value]) =>
      typeof value === 'string' ? [[prefix + key, value]] : Object.entries(flatten(value, `${prefix}${key}.`)),
    ),
  )

describe('app shell text (sidebar, banners, account menu, search)', () => {
  const src = read('components', 'prototype', 'app-shell.tsx')

  it('takes its words from the message files, not hard-coded English', () => {
    const phrases = [
      'label: "Home"', 'Weekly brief', 'My districts', 'Speak up', 'label: "Vote"', 'label: "Alerts"', '>Alerts<',
      'Change address', '>Menu<', 'General', 'Your neighborhood. Your voice.', 'Independent & nonpartisan',
      'Built by Houston students', 'Sample data', 'Use my address', 'Hide the menu', 'Show the menu', '>Navigation<',
      'Search meetings', 'Profile and interests', 'Your area', ' governments`', 'Signed in with Google', 'Guest<',
      'Saved on this browser only', 'Sign in to use it on other devices', 'Explain things for a', '"Sign out"',
      'Sign out and forget this browser', 'Nothing matches that yet', 'heading="Your governments"', 'heading="Updates"',
      '{p.label}',
    ]
    expect(phrases.filter((phrase) => src.includes(phrase))).toEqual([])
  })

  it('wraps the search dialog in <Command>, which cmdk needs (without it, opening search crashed /app)', () => {
    // The first child of <CommandDialog>, after any {/* comment */}, must be <Command>.
    expect(src).toMatch(/<CommandDialog[^>]*>\s*(\{\/\*[^]*?\*\/\}\s*)?<Command[\s>]/)
  })

  it('starts with a skip link to the main content, so keyboard users can jump past the sidebar', () => {
    expect(src).toMatch(/<a\s+href="#main-content"[^>]*>\s*\{\w+\("skip"\)\}/)
    expect(src).toMatch(/<main id="main-content"/)
  })

  it('has every string in English and Spanish, and the Spanish is translated', () => {
    const en = flatten((JSON.parse(read('messages', 'en.json')) as Tree).AppShell as Tree)
    const es = flatten((JSON.parse(read('messages', 'es.json')) as Tree).AppShell as Tree)
    expect(Object.keys(en).length).toBeGreaterThan(30)
    expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort())
    // "General" is the same word in both languages.
    const untranslated = Object.keys(en).filter((key) => en[key] === es[key] && key !== 'sections.general')
    expect(untranslated).toEqual([])
  })
})

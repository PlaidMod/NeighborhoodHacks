import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { contrastRatio } from '@/lib/contrast'

// Guards the four base colors in app/globals.css. If someone changes one,
// the main text pairs must still meet WCAG AA (4.5:1) for small text.
const css = readFileSync(join(process.cwd(), 'app', 'globals.css'), 'utf8')

function base(name: string): string {
  const match = css.match(new RegExp(String.raw`--${name}:\s*(#[0-9a-fA-F]{6})\b`))
  if (!match) throw new Error(`--${name} is not a 6-digit hex color in app/globals.css`)
  return match[1]
}

describe('contrastRatio', () => {
  it('is 21 for black on white and 1 for a color on itself', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1)
    expect(contrastRatio('#3d5a80', '#3d5a80')).toBeCloseTo(1, 5)
  })
})

describe('design token contrast (WCAG AA, 4.5:1)', () => {
  const ink = base('ink')
  const denim = base('denim')
  const brick = base('brick')
  const surface = base('surface')

  it('ink text on white cards', () => {
    expect(contrastRatio(ink, '#ffffff')).toBeGreaterThanOrEqual(4.5)
  })
  it('white text on denim buttons', () => {
    expect(contrastRatio('#ffffff', denim)).toBeGreaterThanOrEqual(4.5)
  })
  it('white text on brick buttons', () => {
    expect(contrastRatio('#ffffff', brick)).toBeGreaterThanOrEqual(4.5)
  })
  it('ink text on the page surface', () => {
    expect(contrastRatio(ink, surface)).toBeGreaterThanOrEqual(4.5)
  })
})

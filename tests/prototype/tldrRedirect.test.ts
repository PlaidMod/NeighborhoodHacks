import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import Tldr from '@/app/(prototype)/app/tldr/page'

// The week in short now sits on the dashboard itself, so its old page only forwards there.
describe('/app/tldr', () => {
  it('sends old links to the dashboard', () => {
    let digest = ''
    try {
      Tldr()
    } catch (error) {
      digest = String((error as { digest?: string }).digest)
    }
    expect(digest).toMatch(/^NEXT_REDIRECT;\w+;\/app;/)
  })

  it('is no longer in the sidebar', () => {
    const shell = readFileSync(join(process.cwd(), 'components', 'prototype', 'app-shell.tsx'), 'utf8')
    expect(shell).not.toContain('/app/tldr')
  })
})

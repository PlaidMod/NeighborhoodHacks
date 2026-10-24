import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), 'utf8')
const tour = read('components', 'prototype', 'app-onboarding-tour.tsx')
const results = read('app', '(public)', 'results', 'page.tsx')

// There was a second, do-nothing walkthrough: a "Get started" card on the results page that only
// pointed at the "Open your dashboard" button under it. The walkthrough is now the dashboard's 7 steps.
describe('the onboarding walkthrough', () => {
  it('no longer starts a card on the results page', () => {
    expect(tour).not.toContain('"/results"')
    expect(tour).not.toContain('governmentCTA')
  })

  it('still starts on the dashboard from the results page link', () => {
    expect(results).toMatch(/\/app\/use\?t=\$\{encodeURIComponent\(state\.data\.bodies_token\)\}&onboarding=1&step=1/)
  })

  it('keeps no copy for the removed card', () => {
    for (const lang of ['en', 'es']) {
      const m = JSON.parse(read('messages', `${lang}.json`)).AppOnboardingTour
      expect(m.governments).toBeUndefined()
      expect(m.clickDashboard).toBeUndefined()
      expect(m.startLabel).toBeUndefined()
      expect(m.home.title).toBeTruthy()
    }
  })
})

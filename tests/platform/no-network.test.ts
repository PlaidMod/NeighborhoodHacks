import { expect, it } from 'vitest'

it('blocks fetch in unit tests', async () => {
  await expect(fetch('https://example.com')).rejects.toThrow('Network is disabled in unit tests')
})

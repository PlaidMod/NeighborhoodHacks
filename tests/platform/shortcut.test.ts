import { describe, expect, it } from 'vitest'
import { searchShortcutLabel } from '@/lib/prototype/shortcut'

describe('searchShortcutLabel', () => {
  it('shows ⌘K on Apple devices', () => {
    expect(searchShortcutLabel('MacIntel')).toBe('⌘K')
    expect(searchShortcutLabel('macOS')).toBe('⌘K')
    expect(searchShortcutLabel('iPad')).toBe('⌘K')
  })

  it('shows Ctrl K, with a non-breaking space, everywhere else', () => {
    expect(searchShortcutLabel('Win32')).toBe('Ctrl K')
    expect(searchShortcutLabel('Windows')).toBe('Ctrl K')
    expect(searchShortcutLabel('Linux x86_64')).toBe('Ctrl K')
    expect(searchShortcutLabel('')).toBe('Ctrl K')
  })
})

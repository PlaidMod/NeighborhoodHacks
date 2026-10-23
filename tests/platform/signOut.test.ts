import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SignOutForm } from '@/components/prototype/sign-out-form'
import { DEMO_PROFILE } from '@/lib/prototype/profile'
import { PROFILE_STORAGE_KEY, hasSavedAddress } from '@/lib/prototype/profile-storage'

function fakeStorage(entries: Record<string, string>) {
  const map = new Map(Object.entries(entries))
  return {
    map,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
  }
}

/** Every .tsx file under a folder, as repo-relative paths with forward slashes. */
function tsxFiles(dir: string): string[] {
  return readdirSync(join(process.cwd(), dir), { recursive: true, encoding: 'utf8' })
    .filter((file) => file.endsWith('.tsx'))
    .map((file) => relative(process.cwd(), join(process.cwd(), dir, file)).split(sep).join('/'))
}

const saved = { name: '', address: '1 Test St, Houston, TX 77002', zip: '77002', personas: [] }

describe('signing out forgets this browser', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('posts to /auth/signout and clears the address saved in this browser first', () => {
    const storage = fakeStorage({ [PROFILE_STORAGE_KEY]: JSON.stringify(saved), unrelated: 'kept' })
    vi.stubGlobal('window', { localStorage: storage })

    const form = SignOutForm({ children: 'Sign out' })
    expect(form.type).toBe('form')
    expect(form.props.action).toBe('/auth/signout')
    expect(form.props.method).toBe('post')

    form.props.onSubmit()
    expect(storage.map.has(PROFILE_STORAGE_KEY)).toBe(false)
    expect(storage.map.get('unrelated')).toBe('kept')
  })

  it('no page or component posts to /auth/signout without SignOutForm', () => {
    const raw = [...tsxFiles('app'), ...tsxFiles('components')].filter(
      (file) =>
        file !== 'components/prototype/sign-out-form.tsx' &&
        readFileSync(join(process.cwd(), file), 'utf8').includes('/auth/signout'),
    )
    expect(raw).toEqual([])
  })
})

describe('hasSavedAddress', () => {
  it('is false for the sample neighbor, so the banner never calls her address yours', () => {
    expect(hasSavedAddress(DEMO_PROFILE)).toBe(false)
  })

  it('is true for an address this reader looked up', () => {
    expect(hasSavedAddress(saved)).toBe(true)
    expect(hasSavedAddress({ ...saved, demo: false })).toBe(true)
  })

  it('is false when no address is saved', () => {
    expect(hasSavedAddress({ ...saved, address: '' })).toBe(false)
    expect(hasSavedAddress({ ...saved, address: '   ' })).toBe(false)
  })
})

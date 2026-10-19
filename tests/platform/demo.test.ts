import { describe, expect, it, vi } from 'vitest'
import { DemoCacheMissError, demoCached, lookupDemoKey, type DemoCacheStore } from '@/lib/demo'

function memoryStore(initial: Record<string, unknown> = {}): DemoCacheStore & { data: Map<string, unknown> } {
  const data = new Map(Object.entries(initial))
  return {
    data,
    get: async (key) => (data.has(key) ? data.get(key) : null),
    set: async (key, payload) => {
      data.set(key, payload)
    },
  }
}

describe('demoCached', () => {
  it('demo hit returns the cached value without calling compute', async () => {
    const store = memoryStore({ k: { answer: 42 } })
    const compute = vi.fn(async () => ({ answer: 0 }))
    await expect(demoCached('k', compute, { store, demoMode: true })).resolves.toEqual({ answer: 42 })
    expect(compute).not.toHaveBeenCalled()
  })

  it("demo miss throws DemoCacheMissError naming the key and doesn't call compute", async () => {
    const compute = vi.fn(async () => 'live')
    const error = await demoCached('lookup:abc', compute, { store: memoryStore(), demoMode: true }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(DemoCacheMissError)
    expect((error as Error).message).toContain('lookup:abc')
    expect(compute).not.toHaveBeenCalled()
  })

  it("live mode calls compute and doesn't write when record is off", async () => {
    const store = memoryStore()
    await expect(demoCached('k', async () => 'live', { store, demoMode: false, record: false })).resolves.toBe('live')
    expect(store.data.size).toBe(0)
  })

  it('record mode writes the result', async () => {
    const store = memoryStore()
    await demoCached('k', async () => ({ v: 1 }), { store, demoMode: false, record: true })
    expect(store.data.get('k')).toEqual({ v: 1 })
  })

  it('compute errors propagate and write nothing', async () => {
    const store = memoryStore()
    const failing = async () => {
      throw new Error('census down')
    }
    await expect(demoCached('k', failing, { store, demoMode: false, record: true })).rejects.toThrow('census down')
    expect(store.data.size).toBe(0)
  })
})

describe('lookupDemoKey', () => {
  it("ignores case and spacing, and the key doesn't contain the address", () => {
    const a = lookupDemoKey('  12014 Fallbrook Dr ')
    const b = lookupDemoKey('12014 FALLBROOK DR')
    expect(a).toBe(b)
    expect(a).toMatch(/^lookup:[0-9a-f]{64}$/)
    expect(a.toUpperCase()).not.toContain('FALLBROOK')
  })
})

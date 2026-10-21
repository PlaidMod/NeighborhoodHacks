import { describe, expect, it } from 'vitest';
import { chunked, fetchAllPages } from '@/lib/paging';

const rows = (n: number, offset = 0) => Array.from({ length: n }, (_, i) => ({ n: offset + i }));

describe('fetchAllPages', () => {
  it('keeps asking for the next range until a short page, past the 1,000-row cap', async () => {
    const ranges: [number, number][] = [];
    const out = await fetchAllPages(async (from, to) => {
      ranges.push([from, to]);
      return { data: rows(Math.min(1000, 2345 - from), from), error: null };
    });
    expect(out).toHaveLength(2345);
    expect(out.at(-1)).toEqual({ n: 2344 });
    expect(ranges).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });

  it('stops after one request when the first page is short', async () => {
    let calls = 0;
    const out = await fetchAllPages(async () => {
      calls++;
      return { data: rows(3), error: null };
    });
    expect(out).toHaveLength(3);
    expect(calls).toBe(1);
  });

  it('throws the query error', async () => {
    await expect(fetchAllPages(async () => ({ data: null, error: { message: 'boom' } }))).rejects.toThrow('boom');
  });

  it('stops at maxPages so a bad query can never loop forever', async () => {
    let calls = 0;
    const out = await fetchAllPages(
      async () => {
        calls++;
        return { data: rows(10), error: null };
      },
      { pageSize: 10, maxPages: 3 },
    );
    expect(calls).toBe(3);
    expect(out).toHaveLength(30);
  });
});

describe('chunked', () => {
  it('splits a list into pieces of at most `size`', () => {
    expect(chunked([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunked([], 2)).toEqual([]);
  });
});

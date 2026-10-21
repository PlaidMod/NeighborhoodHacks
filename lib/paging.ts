// Reading past Supabase's 1,000-row limit, and keeping `.in(...)` lists short enough for a URL.
// Plain TypeScript, so scripts and server code can both use it.

export const DEFAULT_PAGE_SIZE = 1000;
const DEFAULT_MAX_PAGES = 50;

type Page<T> = { data: T[] | null; error: { message: string } | null };

/**
 * Calls `page(from, to)` with consecutive inclusive ranges until one comes back short.
 * Use it with a query that has a stable `.order(...)` and ends in `.range(from, to)`.
 */
export async function fetchAllPages<T>(
  page: (from: number, to: number) => PromiseLike<Page<T>>,
  opts: { pageSize?: number; maxPages?: number } = {},
): Promise<T[]> {
  const size = opts.pageSize ?? DEFAULT_PAGE_SIZE;
  const maxPages = opts.maxPages ?? DEFAULT_MAX_PAGES;
  const out: T[] = [];
  for (let n = 0; n < maxPages; n++) {
    const from = n * size;
    const { data, error } = await page(from, from + size - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < size) break;
  }
  return out;
}

/** Splits a list into pieces of at most `size` (for `.in(...)` filters, which go in the URL). */
export function chunked<T>(list: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

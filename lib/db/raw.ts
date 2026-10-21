import { db } from '../db'

type QueryResult = { data: unknown; error: unknown }
export interface RawQuery extends PromiseLike<QueryResult> {
  eq(column: string, value: unknown): RawQuery
  in(column: string, values: readonly unknown[]): RawQuery
  lte(column: string, value: unknown): RawQuery
  order(column: string, options?: { ascending?: boolean; referencedTable?: string }): RawQuery
  limit(count: number): RawQuery
}
export interface RawDb {
  from(table: string): { select(columns: string): RawQuery }
  rpc(name: string, args: Record<string, unknown>): PromiseLike<QueryResult>
}

export function rawDb(): RawDb {
  return db() as unknown as RawDb
}

export async function rows<T>(query: PromiseLike<QueryResult>): Promise<T[]> {
  const result = await query
  if (result.error) throw new Error('Database query failed')
  return Array.isArray(result.data) ? result.data as T[] : []
}

export async function rpcRows<T>(name: string, args: Record<string, unknown>): Promise<T[]> {
  return rows<T>(rawDb().rpc(name, args))
}

export async function selectRows<T>(table: string, columns: string, filters: (query: RawQuery) => RawQuery): Promise<T[]> {
  return rows<T>(filters(rawDb().from(table).select(columns)))
}

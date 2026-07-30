import { createClient } from '@libsql/client'

// ── pg の Pool と同じ形の最小インターフェース ──────────────────────
// route側のコードは pool.query(sql, params) / pool.connect() をそのまま使い続けられる。
export type QueryResult<T = any> = { rows: T[] }

export type DbClient = {
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>
  release(): void
}

export type DbPool = {
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>
  connect(): Promise<DbClient>
}

// Postgres形式のプレースホルダ（$1, $2, ...）を SQLite形式（?）に変換する。
// このリポジトリのクエリは $1,$2,... を配列の順番通りにしか使っていないため、
// 単純に $数字 を ? に置き換えるだけで対応できる。
function toSqliteSql(sql: string): string {
  return sql.replace(/\$\d+/g, '?')
}

// SQLite に boolean 型は無く 0/1 で保持されるため、
// INSERT/UPDATE のパラメータに boolean が来たら 0/1 に変換してから渡す。
function normalizeParams(params: any[] = []): any[] {
  return params.map(p => (typeof p === 'boolean' ? (p ? 1 : 0) : p))
}

export function createDbPool(): DbPool {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  })

  const query = async <T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> => {
    const result = await client.execute({
      sql: toSqliteSql(sql),
      args: normalizeParams(params),
    })
    return { rows: result.rows as unknown as T[] }
  }

  return {
    query,
    // games.ts の一括削除処理（BEGIN/COMMIT/ROLLBACKを発行するトランザクション）互換用。
    // @libsql/client の transaction() を使い、同一トランザクション内で複数クエリを実行できるようにする。
    connect: async (): Promise<DbClient> => {
      const tx = await client.transaction('write')
      return {
        query: async <T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> => {
          const trimmed = sql.trim().toUpperCase()
          if (trimmed === 'BEGIN') return { rows: [] }        // transaction() 生成時にすでに開始済み
          if (trimmed === 'COMMIT') { await tx.commit();   return { rows: [] } }
          if (trimmed === 'ROLLBACK') { await tx.rollback(); return { rows: [] } }
          const result = await tx.execute({ sql: toSqliteSql(sql), args: normalizeParams(params) })
          return { rows: result.rows as unknown as T[] }
        },
        release: () => { try { tx.close() } catch { /* すでにcommit/rollback済みなら無視 */ } },
      }
    },
  }
}

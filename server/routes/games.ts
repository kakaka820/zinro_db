import express, { Request, Response } from 'express';
 import type { DbPool } from '../db';
 import { Game } from '../types/db';

 const router = express.Router();

export default (pool: DbPool) => {
  // 試合一覧
router.get('/', async (req: Request, res: Response): Promise<void> => {
    const result = await pool.query('SELECT * FROM games ORDER BY played_at DESC');
    res.json(result.rows);
  });

  // 試合登録
  router.post('/', async (req: Request, res: Response): Promise<void> => {
     const { played_at, result: gameResult, notes }:
       { played_at?: string; result?: string; notes?: string } = req.body;
    const result = await pool.query(
      'INSERT INTO games (played_at, result, notes) VALUES ($1, $2, $3) RETURNING *',
      [played_at || null, gameResult || null, notes || null]
    );
    res.json(result.rows[0]);
  });

    // 試合削除（複数まとめて・関連レコードも連鎖削除）
  router.delete('/', async (req: Request, res: Response): Promise<void> => {
    const { ids }: { ids: number[] } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: 'ids は空でない配列で指定してください' });
      return;
    }
    try {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        // 子テーブルを依存順に削除
        await client.query(`DELETE FROM votes          WHERE game_id = ANY($1::int[])`, [ids]);
        await client.query(`DELETE FROM executions     WHERE game_id = ANY($1::int[])`, [ids]);
        await client.query(`DELETE FROM night_kills    WHERE game_id = ANY($1::int[])`, [ids]);
        await client.query(`DELETE FROM co_events      WHERE game_id = ANY($1::int[])`, [ids]);
        await client.query(`DELETE FROM seer_results   WHERE game_id = ANY($1::int[])`, [ids]);
        await client.query(`DELETE FROM medium_results WHERE game_id = ANY($1::int[])`, [ids]);
        await client.query(`DELETE FROM knight_guards  WHERE game_id = ANY($1::int[])`, [ids]);
        await client.query(`DELETE FROM game_participants WHERE game_id = ANY($1::int[])`, [ids]);
        await client.query(`DELETE FROM games          WHERE id = ANY($1::int[])`, [ids]);
        await client.query('COMMIT');
        res.json({ deleted: ids.length });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });


  return router;
};

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
    const placeholders = ids.map(() => '?').join(', ');
    try {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        // 削除対象試合に参加していたプレイヤーIDを先に控えておく（削除後の孤立チェック用）
        const affectedPlayers = await client.query<{ player_id: number }>(
          `SELECT DISTINCT player_id FROM game_participants WHERE game_id IN (${placeholders})`,
          ids
        );
        // 子テーブルを依存順に削除
        await client.query(`DELETE FROM votes             WHERE game_id IN (${placeholders})`, ids);
        await client.query(`DELETE FROM executions        WHERE game_id IN (${placeholders})`, ids);
        await client.query(`DELETE FROM night_kills       WHERE game_id IN (${placeholders})`, ids);
        await client.query(`DELETE FROM co_events         WHERE game_id IN (${placeholders})`, ids);
        await client.query(`DELETE FROM seer_results      WHERE game_id IN (${placeholders})`, ids);
        await client.query(`DELETE FROM medium_results    WHERE game_id IN (${placeholders})`, ids);
        await client.query(`DELETE FROM knight_guards     WHERE game_id IN (${placeholders})`, ids);
        await client.query(`DELETE FROM game_participants WHERE game_id IN (${placeholders})`, ids);
        await client.query(`DELETE FROM games             WHERE id      IN (${placeholders})`, ids);

        // どの試合にも参加していなくなったプレイヤーを一覧からも削除
        const playerIds = affectedPlayers.rows.map(r => r.player_id);
        if (playerIds.length > 0) {
          const playerPlaceholders = playerIds.map(() => '?').join(', ');
          await client.query(
            `DELETE FROM players
             WHERE id IN (${playerPlaceholders})
               AND id NOT IN (SELECT DISTINCT player_id FROM game_participants)`,
            playerIds
          );
        }

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

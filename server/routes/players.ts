import express, { Request, Response } from 'express';
 import type { DbPool } from '../db';
 import { Player } from '../types/db';

 const router = express.Router();

export default (pool: DbPool) => {
  // プレイヤー一覧
  router.get('/', async (req: Request, res: Response): Promise<void> => {
    const result = await pool.query('SELECT * FROM players ORDER BY id');
    res.json(result.rows);
  });

  // プレイヤー登録
  router.post('/', async (req: Request, res: Response): Promise<void> => {
     const { name }: { name: string } = req.body;
  const result = await pool.query(
    `INSERT INTO players (name) VALUES ($1)
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
     RETURNING *`,
    [name]
  );
  res.json(result.rows[0]);
});

  // 孤立プレイヤー一覧（どの試合にも参加していない）
  router.get('/orphans', async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await pool.query(
        `SELECT * FROM players
         WHERE id NOT IN (SELECT DISTINCT player_id FROM game_participants)
         ORDER BY id`
      );
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // 孤立プレイヤーの一括削除（どの試合にも参加していない＝紐づく試合が消えた人をまとめて削除）
  router.delete('/orphans', async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await pool.query(
        `DELETE FROM players
         WHERE id NOT IN (SELECT DISTINCT player_id FROM game_participants)
         RETURNING *`
      );
      res.json({ deleted: result.rows.length, players: result.rows });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return router;
};

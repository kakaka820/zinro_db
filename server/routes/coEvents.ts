import express, { Request, Response } from 'express';
 import type { DbPool } from '../db';
 import { CoEvent } from '../types/db';
 const router = express.Router();
export default (pool: DbPool) => {
 
  // 試合のCO一覧
  router.get('/game/:gameId', async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await pool.query(
        `SELECT ce.*, p.name AS player_name, r.name AS claimed_role_name,
       gp.participant_number AS participant_number
FROM co_events ce
JOIN game_participants gp ON gp.id = ce.participant_id
JOIN players p ON p.id = gp.player_id
JOIN roles r ON r.id = ce.claimed_role_id
WHERE ce.game_id = $1
ORDER BY ce.co_day`,
        [req.params.gameId]
      );
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // CO登録
  router.post('/', async (req, res) => {
    try {
      const { game_id, participant_id, claimed_role_id, co_day, co_timing }:
         { game_id: number; participant_id: number; claimed_role_id: number; co_day?: number; co_timing?: string } = req.body;
      const result = await pool.query(
        `INSERT INTO co_events (game_id, participant_id, claimed_role_id, co_day, co_timing)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [game_id, participant_id, claimed_role_id, co_day, co_timing ?? null]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

// CO更新
  router.put('/:id', async (req: Request, res: Response): Promise<void> => {
    try {
       const { claimed_role_id, co_day, co_timing }:
         { claimed_role_id: number; co_day?: number; co_timing?: string } = req.body;
      const result = await pool.query(
        `UPDATE co_events SET claimed_role_id = $1, co_day = $2, co_timing = $3 WHERE id = $4 RETURNING *`,
        [claimed_role_id, co_day ?? null, co_timing ?? null, req.params.id]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });
  
  // CO削除
  router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
    try {
      await pool.query('DELETE FROM co_events WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return router;
};

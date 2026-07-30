import express, { Request, Response } from 'express';
 import type { DbPool } from '../db';
 import { SeerResult } from '../types/db';

 const router = express.Router();

export default (pool: DbPool) => {
  // 試合の占い結果一覧
  router.get('/game/:gameId', async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await pool.query(
        `SELECT sr.*,
          sp.player_id AS seer_player_id,
          spl.name     AS seer_name,
          tp.player_id AS target_player_id,
          tpl.name     AS target_name
         FROM seer_results sr
         JOIN game_participants sp  ON sp.id  = sr.seer_participant_id
         JOIN players spl           ON spl.id = sp.player_id
         JOIN game_participants tp  ON tp.id  = sr.target_participant_id
         JOIN players tpl           ON tpl.id = tp.player_id
         WHERE sr.game_id = $1
         ORDER BY sr.day_number`,
        [req.params.gameId]
      );
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // 占い結果登録
  router.post('/', async (req: Request, res: Response): Promise<void> => {
    try {
      const { game_id, seer_participant_id, target_participant_id, day_number, result: divResult, disclosed_day }:
         { game_id: number; seer_participant_id: number; target_participant_id: number;
           day_number: number; result: 'white' | 'black'; disclosed_day?: number } = req.body;

      const result = await pool.query(
        `INSERT INTO seer_results (game_id, seer_participant_id, target_participant_id, day_number, result, disclosed_day)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [game_id, seer_participant_id, target_participant_id, day_number, divResult, disclosed_day ?? null]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // 結果・開示日の更新（後から「何日目に村に言った」を埋める）
  router.put('/:id', async (req: Request, res: Response): Promise<void> => {
    try {
      const { result: divResult, disclosed_day }:
         { result: 'white' | 'black'; disclosed_day?: number } = req.body;
      const result = await pool.query(
        `UPDATE seer_results SET result = $1, disclosed_day = $2 WHERE id = $3 RETURNING *`,
        [divResult, disclosed_day ?? null, req.params.id]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // 削除
  router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
    try {
      await pool.query('DELETE FROM seer_results WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return router;
};

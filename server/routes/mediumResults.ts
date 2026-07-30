import express, { Request, Response } from 'express';
 import type { DbPool } from '../db';
 import { MediumResult } from '../types/db';
 const router = express.Router();
export default (pool: DbPool) => {

 
  // 試合の霊媒結果一覧
  router.get('/game/:gameId', async (req: Request, res: Response): Promise<void> => {
    try {
    const result = await pool.query<MediumResult>(
        `SELECT mr.*,
          mp.player_id AS medium_player_id,
          mpl.name     AS medium_name,
          tp.player_id AS target_player_id,
          tpl.name     AS target_name
         FROM medium_results mr
         JOIN game_participants mp  ON mp.id  = mr.medium_participant_id
         JOIN players mpl           ON mpl.id = mp.player_id
         JOIN game_participants tp  ON tp.id  = mr.target_participant_id
         JOIN players tpl           ON tpl.id = tp.player_id
         WHERE mr.game_id = $1
         ORDER BY mr.day_number`,
        [req.params.gameId]
      );
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // 霊媒結果登録
  router.post('/', async (req: Request, res: Response): Promise<void> => {
    try {
      const { game_id, medium_participant_id, target_participant_id, day_number, result: medResult, disclosed_day }:
   { game_id: number; medium_participant_id: number; target_participant_id: number;
     day_number: number; result: 'white' | 'black'; disclosed_day?: number } = req.body;
const result = await pool.query<MediumResult>(
        `INSERT INTO medium_results (game_id, medium_participant_id, target_participant_id, day_number, result, disclosed_day)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [game_id, medium_participant_id, target_participant_id, day_number, medResult, disclosed_day ?? null]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // 結果・開示日の更新
  router.put('/:id', async (req: Request, res: Response): Promise<void> => {
    try {
const { result: medResult, disclosed_day }:
   { result: 'white' | 'black'; disclosed_day?: number } = req.body;
 const result = await pool.query<MediumResult>(
        `UPDATE medium_results SET result = $1, disclosed_day = $2 WHERE id = $3 RETURNING *`,
        [medResult, disclosed_day ?? null, req.params.id]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // 削除
  router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
    try {
      await pool.query('DELETE FROM medium_results WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return router;
};

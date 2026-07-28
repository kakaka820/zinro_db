import express, { Request, Response } from 'express';
 import { Pool } from 'pg';
 import { NightKill } from '../types/db';

 const router = express.Router();

export default (pool: Pool) => {

  // 噛み結果登録
router.post('/', async (req: Request, res: Response): Promise<void> => {
     const { game_id, day_number, participant_id }:
       { game_id: number
    const result = await pool.query(
      `INSERT INTO night_kills (game_id, day_number, participant_id)
       VALUES ($1, $2, $3) RETURNING *`,
      [game_id, day_number, participant_id ?? null]
    );
    res.json(result.rows[0]);
  });

  // 試合の噛み記録一覧
router.get('/game/:gameId', async (req: Request, res: Response): Promise<void> => {
    const result = await pool.query(
      'SELECT * FROM night_kills WHERE game_id = $1 ORDER BY day_number',
      [req.params.gameId]
    );
    res.json(result.rows);
  });

  return router;
};

import express, { Request, Response } from 'express';
 import type { DbPool } from '../db';
 import { NightKill } from '../types/db';

 const router = express.Router();

export default (pool: DbPool) => {

  // 噛み結果登録
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { game_id, day_number, participant_id }: { game_id: number; day_number: number; participant_id?: number } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO night_kills (game_id, day_number, participant_id)
       VALUES ($1, $2, $3) RETURNING *`,
      [game_id, day_number, participant_id ?? null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
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

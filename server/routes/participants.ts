import express, { Request, Response } from 'express';
 import type { DbPool } from '../db';
 import { Participant } from '../types/db';
 const router = express.Router();
export default (pool: DbPool) => {
  // 試合ごとの参加者一覧
  router.get('/game/:gameId', async (req: Request, res: Response): Promise<void> => {
    const result = await pool.query(
      `SELECT gp.*, p.name as player_name, r.name as role_name, r.team
       FROM game_participants gp
       JOIN players p ON p.id = gp.player_id
       LEFT JOIN roles r ON r.id = gp.role_id
       WHERE gp.game_id = $1`,
      [req.params.gameId]
    );
    res.json(result.rows);
  });

   // 参加者登録
  router.post('/', async (req: Request, res: Response): Promise<void> => {
     const { game_id, player_id, role_id, survived, participant_number }
  : { game_id: number; player_id: number; role_id?: number; survived?: boolean; participant_number?: number }
  = req.body;
const result = await pool.query(
  'INSERT INTO game_participants (game_id, player_id, role_id, survived, participant_number) VALUES ($1, $2, $3, $4, $5) RETURNING *',
  [game_id, player_id, role_id ?? null, survived ?? false, participant_number ?? null]
);
    res.json(result.rows[0]);
  });

  // 参加者削除
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  await pool.query('DELETE FROM game_participants WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

  // 参加者更新
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { role_id, survived, participant_number } = req.body;
    const result = await pool.query(
      `UPDATE game_participants SET role_id = $1, survived = $2, participant_number = $3 WHERE id = $4 RETURNING *`,
      [role_id, survived, participant_number ?? null, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});
  
  return router;
};

import express, { Request, Response } from 'express';
 import type { DbPool } from '../db';
 import { Vote } from '../types/db';

 const router = express.Router();

export default (pool: DbPool) => {
  // 試合・日付ごとの投票一覧
  router.get('/game/:gameId/day/:dayNumber', async (req: Request, res: Response): Promise<void> => {
    const result = await pool.query(
      `SELECT v.*, 
        voter.player_id as voter_player_id,
        target.player_id as target_player_id
       FROM votes v
       JOIN game_participants voter ON voter.id = v.voter_id
       JOIN game_participants target ON target.id = v.target_id
       WHERE v.game_id = $1 AND v.day_number = $2
       ORDER BY v.vote_order ASC NULLS LAST`,
      [req.params.gameId, req.params.dayNumber]
    );
    res.json(result.rows);
  });

  // 投票登録
router.post('/', async (req: Request, res: Response): Promise<void> => {
     const { game_id, day_number, vote_type, voter_id, target_id, vote_order, receive_order, is_discard }:
  { game_id: number; day_number: number; vote_type?: 'normal' | 'runoff' | 'runoff2';
    voter_id: number; target_id: number; vote_order?: number; receive_order?: number; is_discard?: boolean } = req.body;

  let finalReceiveOrder = receive_order ?? null;

  // 初日は vote_order から自動計算
  if (Number(day_number) === 1 && vote_order != null) {
    const countResult = await pool.query(
      `SELECT COUNT(*) AS count FROM votes
       WHERE game_id = $1 AND day_number = $2 AND vote_type = $3
         AND target_id = $4 AND vote_order < $5`,
      [game_id, day_number, vote_type ?? 'normal', target_id, vote_order]
    );
    finalReceiveOrder = parseInt(countResult.rows[0].count, 10) + 1;
  }

  const result = await pool.query(
  `INSERT INTO votes (game_id, day_number, vote_type, voter_id, target_id, vote_order, receive_order, is_discard)
   VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
  [game_id, day_number, vote_type ?? 'normal', voter_id, target_id, vote_order ?? null, finalReceiveOrder, is_discard ?? false]
);
  res.json(result.rows[0]);
});

    // 捨て票フラグ更新
  router.put('/:id', async (req: Request, res: Response): Promise<void> => {
    const { is_discard }: { is_discard: boolean } = req.body;
    const result = await pool.query(
      `UPDATE votes SET is_discard = $1 WHERE id = $2 RETURNING *`,
      [is_discard, req.params.id]
    );
    res.json(result.rows[0]);
  });

  return router;
};

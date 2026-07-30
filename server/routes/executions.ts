import express, { Request, Response } from 'express';
 import type { DbPool } from '../db';
 import { Execution } from '../types/db';
 const router = express.Router();
 export default (pool: DbPool) => {
   
 // 吊り結果登録
   router.post('/', async (req: Request, res: Response): Promise<void> => {
     const { game_id, day_number, participant_id, execution_type }:
       { game_id: number; day_number: number; participant_id?: number;
         execution_type: 'normal' | 'random' | 'runoff_execution' | 'none' } = req.body;
    const result = await pool.query(
      `INSERT INTO executions (game_id, day_number, participant_id, execution_type)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [game_id, day_number, participant_id ?? null, execution_type]
    );
    res.json(result.rows[0]);
  });

  // 試合の吊り記録一覧
router.get('/game/:gameId', async (req: Request, res: Response): Promise<void> => {
    const result = await pool.query(
      'SELECT * FROM executions WHERE game_id = $1 ORDER BY day_number',
      [req.params.gameId]
    );
    res.json(result.rows);
  });

  // 吊り結果更新
  router.put('/:id', async (req: Request, res: Response): Promise<void> => {
    try {
      const { participant_id, execution_type }:
        { participant_id?: number; execution_type: 'normal' | 'random' | 'runoff_execution' | 'none' } = req.body;
      const result = await pool.query(
        `UPDATE executions SET participant_id = $1, execution_type = $2 WHERE id = $3 RETURNING *`,
        [participant_id ?? null, execution_type, req.params.id]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // 吊り結果削除
  router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
    try {
      await pool.query('DELETE FROM executions WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return router;
};

import express, { Request, Response } from 'express';
 import { Pool } from 'pg';
 import { Game } from '../types/db';

 const router = express.Router();

export default (pool: Pool) => {
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

  // 試合削除（複数まとめて）
router.delete('/', async (req: Request, res: Response): Promise<void> => {
     const { ids }: { ids: number[] } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: 'ids は空でない配列で指定してください' });
       return;

    }
    await pool.query(
      `DELETE FROM games WHERE id = ANY($1::int[])`,
      [ids]
    );
    res.json({ deleted: ids.length });
  });


  return router;
};

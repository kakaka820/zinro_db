 import express, { Request, Response } from 'express';
 import { Pool } from 'pg';
 import { Player } from '../types/db';

 const router = express.Router();

export default (pool: Pool) => {
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

  return router;
};

import express, { Request, Response } from 'express';
 import type { DbPool } from '../db';
 import { Role } from '../types/db';
 const router = express.Router();

export default (pool: DbPool) => {
  // 役職一覧
router.get('/', async (req: Request, res: Response): Promise<void> => {
    const result = await pool.query('SELECT * FROM roles ORDER BY id');
    res.json(result.rows);
  });

  // 役職登録
router.post('/', async (req: Request, res: Response): Promise<void> => {
     const { name, team }: { name: string; team: 'village' | 'wolf' | 'other' } = req.body;
    const result = await pool.query(
      'INSERT INTO roles (name, team) VALUES ($1, $2) RETURNING *',
      [name, team]
    );
    res.json(result.rows[0]);
  });

router.put('/:id', async (req: Request, res: Response): Promise<void> => {
     const { needs_co }: { needs_co: boolean } = req.body;
  const result = await pool.query(
    'UPDATE roles SET needs_co = $1 WHERE id = $2 RETURNING *',
    [needs_co, req.params.id]
  );
  res.json(result.rows[0]);
});
  
  return router;
};

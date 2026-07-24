const express = require('express');
const router = express.Router();

module.exports = (pool) => {
  // 試合一覧
  router.get('/', async (req, res) => {
    const result = await pool.query('SELECT * FROM games ORDER BY played_at DESC');
    res.json(result.rows);
  });

  // 試合登録
  router.post('/', async (req, res) => {
    const { played_at, result: gameResult, notes } = req.body;
    const result = await pool.query(
      'INSERT INTO games (played_at, result, notes) VALUES ($1, $2, $3) RETURNING *',
      [played_at || null, gameResult || null, notes || null]
    );
    res.json(result.rows[0]);
  });

  // 試合削除（複数まとめて）
  router.delete('/', async (req, res) => {
    const { ids } = req.body;  // ids: number[]
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids は空でない配列で指定してください' });
    }
    await pool.query(
      `DELETE FROM games WHERE id = ANY($1::int[])`,
      [ids]
    );
    res.json({ deleted: ids.length });
  });


  return router;
};

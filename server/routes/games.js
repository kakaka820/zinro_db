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
      [played_at, gameResult, notes]
    );
    res.json(result.rows[0]);
  });

  return router;
};

const express = require('express');
const router = express.Router();

module.exports = (pool) => {
  // プレイヤー一覧
  router.get('/', async (req, res) => {
    const result = await pool.query('SELECT * FROM players ORDER BY id');
    res.json(result.rows);
  });

  // プレイヤー登録
  router.post('/', async (req, res) => {
  const { name } = req.body;
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

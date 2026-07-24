const express = require('express');
const router = express.Router();

module.exports = (pool) => {
  // 役職一覧
  router.get('/', async (req, res) => {
    const result = await pool.query('SELECT * FROM roles ORDER BY id');
    res.json(result.rows);
  });

  // 役職登録
  router.post('/', async (req, res) => {
    const { name, team } = req.body;
    const result = await pool.query(
      'INSERT INTO roles (name, team) VALUES ($1, $2) RETURNING *',
      [name, team]
    );
    res.json(result.rows[0]);
  });

  return router;
};

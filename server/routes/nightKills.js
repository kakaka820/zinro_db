const express = require('express');
const router = express.Router();

module.exports = (pool) => {
  // 噛み結果登録
  router.post('/', async (req, res) => {
    const { game_id, day_number, participant_id } = req.body;
    const result = await pool.query(
      `INSERT INTO night_kills (game_id, day_number, participant_id)
       VALUES ($1, $2, $3) RETURNING *`,
      [game_id, day_number, participant_id ?? null]
    );
    res.json(result.rows[0]);
  });

  // 試合の噛み記録一覧
  router.get('/game/:gameId', async (req, res) => {
    const result = await pool.query(
      'SELECT * FROM night_kills WHERE game_id = $1 ORDER BY day_number',
      [req.params.gameId]
    );
    res.json(result.rows);
  });

  return router;
};

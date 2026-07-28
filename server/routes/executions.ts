const express = require('express');
const router = express.Router();

module.exports = (pool) => {
  // 吊り結果登録
  router.post('/', async (req, res) => {
    const { game_id, day_number, participant_id, execution_type } = req.body;
    const result = await pool.query(
      `INSERT INTO executions (game_id, day_number, participant_id, execution_type)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [game_id, day_number, participant_id ?? null, execution_type]
    );
    res.json(result.rows[0]);
  });

  // 試合の吊り記録一覧
  router.get('/game/:gameId', async (req, res) => {
    const result = await pool.query(
      'SELECT * FROM executions WHERE game_id = $1 ORDER BY day_number',
      [req.params.gameId]
    );
    res.json(result.rows);
  });

  return router;
};

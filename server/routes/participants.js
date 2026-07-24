const express = require('express');
const router = express.Router();

module.exports = (pool) => {
  // 試合ごとの参加者一覧
  router.get('/game/:gameId', async (req, res) => {
    const result = await pool.query(
      `SELECT gp.*, p.name as player_name, r.name as role_name, r.team
       FROM game_participants gp
       JOIN players p ON p.id = gp.player_id
       JOIN roles r ON r.id = gp.role_id
       WHERE gp.game_id = $1`,
      [req.params.gameId]
    );
    res.json(result.rows);
  });

  // 参加者登録
  router.post('/', async (req, res) => {
    const { game_id, player_id, role_id, survived } = req.body;
    const result = await pool.query(
      'INSERT INTO game_participants (game_id, player_id, role_id, survived) VALUES ($1, $2, $3, $4) RETURNING *',
      [game_id, player_id, role_id, survived ?? false]
    );
    res.json(result.rows[0]);
  });

  return router;
};

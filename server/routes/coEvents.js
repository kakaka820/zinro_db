const express = require('express');
const router = express.Router();

module.exports = (pool) => {
  // 試合のCO一覧
  router.get('/game/:gameId', async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT ce.*, p.name AS player_name, r.name AS claimed_role_name
         FROM co_events ce
         JOIN game_participants gp ON gp.id = ce.participant_id
         JOIN players p ON p.id = gp.player_id
         JOIN roles r ON r.id = ce.claimed_role_id
         WHERE ce.game_id = $1
         ORDER BY ce.co_day`,
        [req.params.gameId]
      );
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // CO登録
  router.post('/', async (req, res) => {
    try {
      const { game_id, participant_id, claimed_role_id, co_day } = req.body;
      const result = await pool.query(
        `INSERT INTO co_events (game_id, participant_id, claimed_role_id, co_day)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [game_id, participant_id, claimed_role_id, co_day]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // CO削除
  router.delete('/:id', async (req, res) => {
    try {
      await pool.query('DELETE FROM co_events WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};

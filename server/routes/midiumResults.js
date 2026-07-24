const express = require('express');
const router = express.Router();

module.exports = (pool) => {
  // 試合の霊媒結果一覧
  router.get('/game/:gameId', async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT mr.*,
          mp.player_id AS medium_player_id,
          mpl.name     AS medium_name,
          tp.player_id AS target_player_id,
          tpl.name     AS target_name
         FROM medium_results mr
         JOIN game_participants mp  ON mp.id  = mr.medium_participant_id
         JOIN players mpl           ON mpl.id = mp.player_id
         JOIN game_participants tp  ON tp.id  = mr.target_participant_id
         JOIN players tpl           ON tpl.id = tp.player_id
         WHERE mr.game_id = $1
         ORDER BY mr.day_number`,
        [req.params.gameId]
      );
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 霊媒結果登録
  router.post('/', async (req, res) => {
    try {
      const { game_id, medium_participant_id, target_participant_id, day_number, result: medResult, disclosed_day } = req.body;
      const result = await pool.query(
        `INSERT INTO medium_results (game_id, medium_participant_id, target_participant_id, day_number, result, disclosed_day)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [game_id, medium_participant_id, target_participant_id, day_number, medResult, disclosed_day ?? null]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 開示日の更新
  router.put('/:id', async (req, res) => {
    try {
      const { disclosed_day } = req.body;
      const result = await pool.query(
        `UPDATE medium_results SET disclosed_day = $1 WHERE id = $2 RETURNING *`,
        [disclosed_day ?? null, req.params.id]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 削除
  router.delete('/:id', async (req, res) => {
    try {
      await pool.query('DELETE FROM medium_results WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};

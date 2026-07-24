const express = require('express');
const router = express.Router();

module.exports = (pool) => {
  // 試合の占い結果一覧
  router.get('/game/:gameId', async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT sr.*,
          sp.player_id AS seer_player_id,
          spl.name     AS seer_name,
          tp.player_id AS target_player_id,
          tpl.name     AS target_name
         FROM seer_results sr
         JOIN game_participants sp  ON sp.id  = sr.seer_participant_id
         JOIN players spl           ON spl.id = sp.player_id
         JOIN game_participants tp  ON tp.id  = sr.target_participant_id
         JOIN players tpl           ON tpl.id = tp.player_id
         WHERE sr.game_id = $1
         ORDER BY sr.day_number`,
        [req.params.gameId]
      );
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 占い結果登録
  router.post('/', async (req, res) => {
    try {
      const { game_id, seer_participant_id, target_participant_id, day_number, result: divResult, disclosed_day } = req.body;
      const result = await pool.query(
        `INSERT INTO seer_results (game_id, seer_participant_id, target_participant_id, day_number, result, disclosed_day)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [game_id, seer_participant_id, target_participant_id, day_number, divResult, disclosed_day ?? null]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 開示日の更新（後から「何日目に村に言った」を埋める）
  router.put('/:id', async (req, res) => {
    try {
      const { disclosed_day } = req.body;
      const result = await pool.query(
        `UPDATE seer_results SET disclosed_day = $1 WHERE id = $2 RETURNING *`,
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
      await pool.query('DELETE FROM seer_results WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};

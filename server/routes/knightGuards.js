const express = require('express');
const router = express.Router();

module.exports = (pool) => {
  // 試合の護衛記録一覧
  router.get('/game/:gameId', async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT kg.*,
          kp.player_id  AS knight_player_id,
          kpl.name      AS knight_name,
          tp.player_id  AS target_player_id,
          tpl.name      AS target_name
         FROM knight_guards kg
         JOIN game_participants kp   ON kp.id  = kg.knight_participant_id
         JOIN players kpl            ON kpl.id = kp.player_id
         LEFT JOIN game_participants tp  ON tp.id  = kg.target_participant_id
         LEFT JOIN players tpl           ON tpl.id = tp.player_id
         WHERE kg.game_id = $1
         ORDER BY kg.day_number`,
        [req.params.gameId]
      );
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 護衛記録登録（target_participant_idはNULL可）
  router.post('/', async (req, res) => {
    try {
      const { game_id, knight_participant_id, target_participant_id, day_number, is_gj, disclosed_day } = req.body;
      const result = await pool.query(
        `INSERT INTO knight_guards (game_id, knight_participant_id, target_participant_id, day_number, is_gj, disclosed_day)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [game_id, knight_participant_id, target_participant_id ?? null, day_number, is_gj ?? false, disclosed_day ?? null]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 更新（護衛先が後から判明した場合など）
  router.put('/:id', async (req, res) => {
    try {
      const { target_participant_id, is_gj, disclosed_day } = req.body;
      const result = await pool.query(
        `UPDATE knight_guards
         SET target_participant_id = $1, is_gj = $2, disclosed_day = $3
         WHERE id = $4 RETURNING *`,
        [target_participant_id ?? null, is_gj ?? false, disclosed_day ?? null, req.params.id]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 削除
  router.delete('/:id', async (req, res) => {
    try {
      await pool.query('DELETE FROM knight_guards WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};

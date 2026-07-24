const express = require('express');
const router = express.Router();

module.exports = (pool) => {
  // 試合・日付ごとの投票一覧
  router.get('/game/:gameId/day/:dayNumber', async (req, res) => {
    const result = await pool.query(
      `SELECT v.*, 
        voter.player_id as voter_player_id,
        target.player_id as target_player_id
       FROM votes v
       JOIN game_participants voter ON voter.id = v.voter_id
       JOIN game_participants target ON target.id = v.target_id
       WHERE v.game_id = $1 AND v.day_number = $2
       ORDER BY v.vote_order ASC NULLS LAST`,
      [req.params.gameId, req.params.dayNumber]
    );
    res.json(result.rows);
  });

  // 投票登録
  router.post('/', async (req, res) => {
    const { game_id, day_number, vote_type, voter_id, target_id, vote_order, receive_order } = req.body;
    const result = await pool.query(
      `INSERT INTO votes (game_id, day_number, vote_type, voter_id, target_id, vote_order, receive_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [game_id, day_number, vote_type ?? 'normal', voter_id, target_id, vote_order ?? null, receive_order ?? null]
    );
    res.json(result.rows[0]);
  });

  return router;
};

import express, { Request, Response } from 'express';
import type { DbPool, QueryResult } from '../db';
 import { Vote } from '../types/db';

 const router = express.Router();

export default (pool: DbPool) => {
  // 試合・日付ごとの投票一覧
  router.get('/game/:gameId/day/:dayNumber', async (req: Request, res: Response): Promise<void> => {
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

// upsertVote() は pool（DbPool）からも client（DbClient、トランザクション中）からも
// 呼べるように、共通する query() だけを持つ最小インターフェースとして定義する
type Queryable = {
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>
}

// 投票登録・更新時にクライアントから受け取るデータの形
type VoteInput = {
  game_id: number
  day_number: number
  voter_id: number
  target_id: number
  vote_type?: 'normal' | 'runoff' | 'runoff2'
  vote_order?: number | null
  receive_order?: number | null
  is_discard?: boolean
}

async function upsertVote(db: Queryable, v: VoteInput): Promise<Vote> {
  const {
    game_id,
    day_number,
    voter_id,
    target_id,
    vote_order,
    receive_order,
    is_discard,
  } = v
  const vote_type = v.vote_type ?? 'normal'

  let finalReceiveOrder = receive_order ?? null

  // 初日の投票順が入力されている場合は、その投票順から
  // 投票先ごとの受けた順番を自動計算する。
  if (Number(day_number) === 1 && vote_order != null) {
    const countResult = await db.query<{ count: number }>(
      `SELECT COUNT(*) AS count
       FROM votes
       WHERE game_id = $1
         AND day_number = $2
         AND vote_type = $3
         AND target_id = $4
         AND vote_order < $5
         AND voter_id != $6`,
      [game_id, day_number, vote_type, target_id, vote_order, voter_id],
    )
    finalReceiveOrder = Number(countResult.rows[0]?.count ?? 0) + 1
  }

  const result = await db.query<Vote>(
    `INSERT INTO votes
       (game_id, day_number, vote_type, voter_id, target_id,
        vote_order, receive_order, is_discard)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (game_id, day_number, vote_type, voter_id)
     DO UPDATE SET
       target_id = excluded.target_id,
       vote_order = excluded.vote_order,
       receive_order = excluded.receive_order,
       is_discard = excluded.is_discard
     RETURNING *`,
    [
      game_id,
      day_number,
      vote_type,
      voter_id,
      target_id,
      vote_order ?? null,
      finalReceiveOrder,
      is_discard ?? false,
    ],
  )

  return result.rows[0]
}

// 投票登録（1件）
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const row = await upsertVote(pool, req.body as VoteInput)
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// 投票登録（複数まとめて・1トランザクション）
router.post('/bulk', async (req: Request, res: Response): Promise<void> => {
  const { votes }: { votes: VoteInput[] } = req.body;
  if (!Array.isArray(votes) || votes.length === 0) {
    res.status(400).json({ error: 'votes は空でない配列で指定してください' });
    return;
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const rows: Vote[] = [];
    for (const v of votes) rows.push(await upsertVote(client, v));
    await client.query('COMMIT');
    res.json(rows);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: (err as Error).message });
  } finally {
    client.release();
  }
});


 // 投票全置き換え（DELETE → 一括INSERT）
router.post('/replace', async (req: Request, res: Response): Promise<void> => {
  const { game_id, day_number, vote_type, votes: voteInputs }:
    { game_id: number; day_number: number; vote_type: string; votes: VoteInput[] } = req.body

  if (
    !Number.isFinite(Number(game_id)) ||
    !Number.isFinite(Number(day_number)) ||
    !['normal', 'runoff', 'runoff2'].includes(vote_type) ||
    !Array.isArray(voteInputs)
  ) {
    res.status(400).json({ error: '投票データの形式が正しくありません' })
    return
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    // 既存の投票を全削除（このゲーム・日・種別）
    await client.query(
      `DELETE FROM votes WHERE game_id = $1 AND day_number = $2 AND vote_type = $3`,
      [game_id, day_number, vote_type]
    )
    // 新しい投票を挿入（空配列なら全削除のみで終わる）
    const rows: Vote[] = []
    for (const v of voteInputs) {
      rows.push(await upsertVote(client, {
        ...v,
        game_id,
        day_number,
        vote_type: vote_type as VoteInput['vote_type'],
      }))
    }
    await client.query('COMMIT')
    res.json(rows)
  } catch (err) {
    await client.query('ROLLBACK')
    res.status(500).json({ error: (err as Error).message })
  } finally {
    client.release()
  }
})
 

    // 捨て票フラグ更新
  router.put('/:id', async (req: Request, res: Response): Promise<void> => {
    const { is_discard }: { is_discard: boolean } = req.body;
    const result = await pool.query(
      `UPDATE votes SET is_discard = $1 WHERE id = $2 RETURNING *`,
      [is_discard, req.params.id]
    );
    res.json(result.rows[0]);
  });

  return router;
};

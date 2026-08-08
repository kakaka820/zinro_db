import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { api } from '../api'
import VoteMatrixInput from './VoteMatrixInput'
import type { Participant, Vote } from '../types'
 
type Props = {
  gameId: string
  participants: Participant[]
  day: number
  votes: Vote[]
  onRefresh: () => void
}
 
export type VoteSectionHandle = {
  // 表の「まだ記録ボタンを押していない入力」があれば保存する
  flush: () => Promise<void>
}
 
const VoteSection = forwardRef<VoteSectionHandle, Props>(function VoteSection(
  { gameId, participants, day, votes, onRefresh }, ref
) {
 
const [normalMatrix,    setNormalMatrix]    = useState<Record<string, string[]>>({})
const [normalVoteOrder, setNormalVoteOrder] = useState<Record<number, string>>({})
 
  const [submitting,      setSubmitting]      = useState<'normal'|null>(null)
  const [showNames, setShowNames] = useState(false)
 
 
 
  useEffect(() => {
  const nm: Record<string, string[]> = {}
  const order: Record<number, string> = {}
  for (const v of votes) {
    const voterNum = participants.find(p => p.id === v.voter_id)?.participant_number
    if (voterNum == null) continue
    const target = String(v.target_id)
    if (v.vote_type === 'normal') {
      const label = v.is_discard ? `${voterNum}@` : String(voterNum)
      nm[target] = [...(nm[target] ?? []), label]
      if (v.vote_order != null) order[v.voter_id] = String(v.vote_order)
    }
  }
  setNormalMatrix(nm)
  setNormalVoteOrder(order)
}, [votes])
 
// 通常投票の一括登録（決選投票はRunoffVoteSectionへ移動）
const makeSubmitter = (
  voteType: 'normal',
  matrixData: Record<string, string[]>,
  voteOrderData: Record<number, string> = {},
) => async () => {
  if (submitting) return
  setSubmitting(voteType)
  try {
    const toSubmit: object[] = []
    for (const [targetIdStr, voterNums] of Object.entries(matrixData)) {
      for (const voterNumStr of voterNums ?? []) {
        if (!voterNumStr.trim()) continue
        // 末尾に「@」が付いていたら捨て票として扱う（例: 5@ → 5番の投票を捨て票扱い）
        const trimmed = voterNumStr.trim()
        const isDiscard = trimmed.endsWith('@')
        const voter = resolveParticipant(isDiscard ? trimmed.slice(0, -1) : trimmed)
        if (!voter) { alert(`「${voterNumStr}」が見つかりません`); return }
        const orderStr = voteOrderData[voter.id]
        // 既存の投票があれば、表では編集できない項目（受けた順番）を保持する
        const existing = votes.find(v =>
          v.voter_id === voter.id &&
          v.target_id === Number(targetIdStr) &&
          v.vote_type === voteType
        )
        toSubmit.push({
          game_id: Number(gameId), day_number: day, vote_type: voteType,
          voter_id: voter.id, target_id: Number(targetIdStr),
          vote_order: (day === 1 && orderStr?.trim()) ? Number(orderStr) : null,
          receive_order: existing?.receive_order ?? null,
          is_discard: isDiscard,
        })
      }
    }
    // 未入力の状態で保存ボタンを押しても、既存の投票を削除しない。
    // 表の初期ロード前に「まとめて保存」を押した場合も同様。
    if (toSubmit.length === 0) return
    await api.post('/votes/replace', {
      game_id: Number(gameId), day_number: day, vote_type: voteType, votes: toSubmit,
    })
    await onRefresh()
  } finally {
    setSubmitting(null)
  }
}
 
 
  
  const resolveParticipant = (input: string) => {
    const trimmed = input.trim()
    if (!trimmed) return null
    const num = parseInt(trimmed, 10)
    if (!isNaN(num) && String(num) === trimmed)
      return participants.find(p => p.participant_number === num) ?? null
    return participants.find(p => p.player_name === trimmed) ?? null
  }
 
useImperativeHandle(ref, () => ({
  async flush() {
    await makeSubmitter('normal', normalMatrix, normalVoteOrder)()
  },
}))
 
 
  return (
    <div className="card" id="vote-section">
      <h2 style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
  {day}日目：投票
  <button
    type="button" className="secondary"
    style={{ fontSize: 12, padding: '2px 10px' }}
    onClick={() => setShowNames(v => !v)}
  >
    {showNames ? '名前を非表示' : '名前を表示'}
  </button>
</h2>
    <VoteMatrixInput
      title="通常投票"
      participants={participants}
      matrixInput={normalMatrix}
      setMatrixInput={setNormalMatrix}
      onSubmit={makeSubmitter('normal', normalMatrix, normalVoteOrder)}
      submitting={submitting === 'normal'}
      day={day}
      voteOrderInput={normalVoteOrder}
      setVoteOrderInput={setNormalVoteOrder}
    />
 
      {votes.length > 0 && (
        <table style={{ marginTop: 12 }}>
                    <thead>
            <tr>
              <th>投票した人</th><th>投票先</th><th>種別</th>
              {day === 1 && <th>投票順</th>}
              <th>受けた順番</th>
              <th>捨て票</th>
            </tr>
          </thead>
          <tbody>
                        {votes.map(v => (
              <tr key={v.id}>
                <td>
  {showNames
    ? participants.find(p => p.id === v.voter_id)?.player_name ?? v.voter_id
    : (participants.find(p => p.id === v.voter_id)?.participant_number ?? v.voter_id)}
</td>
<td>
  {showNames
    ? participants.find(p => p.id === v.target_id)?.player_name ?? v.target_id
    : (participants.find(p => p.id === v.target_id)?.participant_number ?? v.target_id)}
</td>
 
 
                <td>
  {v.vote_type === 'normal' ? '通常'
    : v.vote_type === 'runoff' ? '決選'
    : '2回目決選'}
</td>
                {day === 1 && <td>{v.vote_order    ?? '―'}</td>}
                <td>{v.receive_order ?? '―'}</td>
                <td style={{ textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={!!v.is_discard}
                    onChange={async e => {
                      await api.put(`/votes/${v.id}`, { is_discard: e.target.checked })
                      onRefresh()
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
})
 
export default VoteSection

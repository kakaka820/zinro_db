import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
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
 
 
 
  // 「編集中(未保存の変更がある)かどうか」を追跡する。
  // 編集中でなければ votes が更新されるたびに何度でも復元してよい
  // （他セクションの保存による再取得でも、正しく最新状態に追従できる）。
  // 編集中の間だけ、他セクションの保存に巻き込まれて votes が更新されても上書きしないようにする。
  const dirtyRef = useRef(false)

  useEffect(() => {
    dirtyRef.current = false   // 日が変わったら未編集の状態に戻す
  }, [day])

  useEffect(() => {
  if (dirtyRef.current) return
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
}, [votes, day])

  // ユーザーがセルを編集した/クリアした時に呼ぶ。以後、votesが更新されても上書きしない。
  const setNormalMatrixTracked: typeof setNormalMatrix = updater => {
    dirtyRef.current = true
    setNormalMatrix(updater)
  }
  const setNormalVoteOrderTracked: typeof setNormalVoteOrder = updater => {
    dirtyRef.current = true
    setNormalVoteOrder(updater)
  }
 
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
    // ただし、ユーザーが実際に編集（クリア含む）した後は、
    // 空の表の送信＝「全部削除する」という意思表示とみなして送信する。
    if (toSubmit.length === 0 && !dirtyRef.current) return
    await api.post('/votes/replace', {
      game_id: Number(gameId), day_number: day, vote_type: voteType, votes: toSubmit,
    })
    dirtyRef.current = false   // 保存できたので、以後は votes の更新に素直に追従してよい
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
</h2>
    <VoteMatrixInput
      title="通常投票"
      participants={participants}
      matrixInput={normalMatrix}
      setMatrixInput={setNormalMatrixTracked}
      onSubmit={makeSubmitter('normal', normalMatrix, normalVoteOrder)}
      submitting={submitting === 'normal'}
      day={day}
      voteOrderInput={normalVoteOrder}
      setVoteOrderInput={setNormalVoteOrderTracked}
      showVoteOrder
    />
    </div>
  )
})
 
export default VoteSection

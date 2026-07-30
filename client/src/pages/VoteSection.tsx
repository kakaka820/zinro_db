import { useState, useEffect, useRef } from 'react'
import { api } from '../api'
import VoteMatrixInput from './VoteMatrixInput'
import type { Participant, Vote } from '../types'

type Props = {
  gameId: string
  participants: Participant[]
  day: number
}

export default function VoteSection({ gameId, participants, day }: Props) {
  const [votes,         setVotes]         = useState<Vote[]>([])
  const [voteInputMode, setVoteInputMode] = useState<'form' | 'table'>('form')
  const [matrixInput,   setMatrixInput]   = useState<Record<string, string[]>>({})
  const [matrixType, setMatrixType] = useState<'normal' | 'runoff' | 'runoff2'>('normal')
　const [voteOrderInput, setVoteOrderInput] = useState<Record<number, string>>({})
  const [vVoterInput,   setVVoterInput]   = useState('')
  const [vTargetInput,  setVTargetInput]  = useState('')
  const [vType,         setVType]         = useState('normal')
  const [vVoteOrder,    setVVoteOrder]    = useState('')
  const [vReceiveOrder, setVReceiveOrder] = useState('')
  const [vIsDiscard,    setVIsDiscard]    = useState(false)

  const loadVotes = () =>
    api.get<Vote[]>(`/votes/game/${gameId}/day/${day}`).then(setVotes)

  useEffect(() => { loadVotes() }, [gameId, day])

  useEffect(() => {
    if (voteInputMode !== 'table') return
    const matrix: Record<string, string[]> = {}
    const order: Record<number, string> = {}
    for (const v of votes.filter(v => v.vote_type === matrixType)) {
      const voterNum = participants.find(p => p.id === v.voter_id)?.participant_number
      if (voterNum == null) continue
      if (!matrix[v.target_id]) matrix[v.target_id] = []
      matrix[v.target_id].push(String(voterNum))
      if (v.vote_order != null) order[v.voter_id] = String(v.vote_order)
    }
    setMatrixInput(matrix)
    setVoteOrderInput(order)
  }, [votes, matrixType, voteInputMode])

  const resolveParticipant = (input: string) => {
    const trimmed = input.trim()
    if (!trimmed) return null
    const num = parseInt(trimmed, 10)
    if (!isNaN(num) && String(num) === trimmed)
      return participants.find(p => p.participant_number === num) ?? null
    return participants.find(p => p.player_name === trimmed) ?? null
  }

  const addVote = async (e: React.FormEvent) => {
    e.preventDefault()
    const voter  = resolveParticipant(vVoterInput)
    const target = resolveParticipant(vTargetInput)
    if (!voter || !target) {
      alert('投票した人・投票先が見つかりません（番号か名前で入力してください）')
      return
    }
        await api.post('/votes', {
      game_id:       Number(gameId),
      day_number:    day,
      vote_type:     vType,
      voter_id:      voter.id,
      target_id:     target.id,
      vote_order:    day === 1 && vVoteOrder    ? Number(vVoteOrder)    : null,
      receive_order: day !== 1 && vReceiveOrder ? Number(vReceiveOrder) : null,
      is_discard:    vIsDiscard,
    })
    setVVoterInput(''); setVTargetInput(''); setVVoteOrder(''); setVReceiveOrder(''); setVIsDiscard(false)
    loadVotes()
  }

  const isSubmittingMatrix = useRef(false)              // ★追加
const [matrixSubmitting, setMatrixSubmitting] = useState(false)  // ★追加

const submitMatrix = async () => {
  if (isSubmittingMatrix.current) return              // ★連打を即ブロック
  isSubmittingMatrix.current = true
  setMatrixSubmitting(true)
  try {
    const toSubmit: object[] = []
    for (const [targetIdStr, voterNums] of Object.entries(matrixInput)) {
      for (const voterNumStr of (voterNums ?? [])) {
        if (!voterNumStr.trim()) continue
        const voter = resolveParticipant(voterNumStr.trim())
        if (!voter) { alert(`「${voterNumStr}」が見つかりません`); return }
        // alreadyExists のチェックは削除
        // → サーバー側がupsertするので不要（むしろ修正の再送信もできるようになる）
        const orderStr = voteOrderInput[voter.id]
        const voteOrder = (day === 1 && matrixType === 'normal' && orderStr && orderStr.trim())
          ? Number(orderStr) : null
        toSubmit.push({
          game_id: Number(gameId), day_number: day, vote_type: matrixType,
          voter_id: voter.id, target_id: Number(targetIdStr),
          vote_order: voteOrder, receive_order: null,
        })
      }
    }
    if (!toSubmit.length) { await loadVotes(); return }
    await api.post('/votes/bulk', { votes: toSubmit })   // ★1回のリクエストに変更
    await loadVotes()
  } finally {
    isSubmittingMatrix.current = false
    setMatrixSubmitting(false)
  }
}

  return (
    <div className="card" id="vote-section">
      <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {day}日目：投票
        <button
          type="button" className="secondary"
          style={{ fontSize: 12, padding: '2px 10px' }}
          onClick={() => { setVoteInputMode(m => m === 'form' ? 'table' : 'form'); setMatrixInput({}) }}
        >
          {voteInputMode === 'form' ? '表入力に切替' : 'フォーム入力に切替'}
        </button>
      </h2>

      {voteInputMode === 'form' ? (
        <form onSubmit={addVote}>
          {day === 1 ? (
            <>
              <input value={vVoterInput} onChange={e => setVVoterInput(e.target.value)}
                placeholder="投票した人（番号or名前）" style={{ width: 180 }} required />
              <input value={vTargetInput} onChange={e => setVTargetInput(e.target.value)}
                placeholder="投票先（番号or名前）" style={{ width: 170 }} required />
              <select value={vType} onChange={e => setVType(e.target.value)}>
  <option value="normal">通常投票</option>
  <option value="runoff">決選投票</option>
  <option value="runoff2">2回目決選投票</option>
</select>
              <input type="number" min="1" value={vVoteOrder}
                onChange={e => setVVoteOrder(e.target.value)}
                placeholder="投票順（初日のみ）" style={{ width: 150 }} />
            </>
          ) : (
            <>
              <input value={vTargetInput} onChange={e => setVTargetInput(e.target.value)}
                placeholder="投票先（番号or名前）" style={{ width: 170 }} required />
              <input type="number" min="1" value={vReceiveOrder}
                onChange={e => setVReceiveOrder(e.target.value)}
                placeholder="受けた順番" style={{ width: 120 }} />
              <select value={vType} onChange={e => setVType(e.target.value)}>
  <option value="normal">通常投票</option>
  <option value="runoff">決選投票</option>
  <option value="runoff2">2回目決選投票</option>
</select>
              <input value={vVoterInput} onChange={e => setVVoterInput(e.target.value)}
                placeholder="投票した人（番号or名前）" style={{ width: 180 }} required />
            </>
          )}
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input type="checkbox" checked={vIsDiscard} onChange={e => setVIsDiscard(e.target.checked)} />
            捨て票
          </label>
          <button type="submit">記録</button>
        </form>
      ) : (
        <VoteMatrixInput
          participants={participants}
          matrixInput={matrixInput}
          setMatrixInput={setMatrixInput}
          matrixType={matrixType}
          setMatrixType={setMatrixType}
          onSubmit={submitMatrix}
          votes={votes}
          day={day}
          voteOrderInput={voteOrderInput}
          setVoteOrderInput={setVoteOrderInput}
        />
      )}

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
                <td>{participants.find(p => p.id === v.voter_id)?.player_name  ?? v.voter_id}</td>
                <td>{participants.find(p => p.id === v.target_id)?.player_name ?? v.target_id}</td>
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
                      loadVotes()
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
}

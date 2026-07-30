import { useState, useEffect, useRef } from 'react'
import { api } from '../api'
import VoteMatrixInput from './VoteMatrixInput'
import type { Participant, Vote, Execution } from '../types'

type Props = {
  gameId: string
  participants: Participant[]
  day: number
  executions: Execution[]
}

export default function VoteSection({ gameId, participants, day, executions }: Props) {
  const [votes,         setVotes]         = useState<Vote[]>([])
  const [voteInputMode, setVoteInputMode] = useState<'form' | 'table'>('form')
const [normalMatrix,    setNormalMatrix]    = useState<Record<string, string[]>>({})
const [runoffMatrix,    setRunoffMatrix]    = useState<Record<string, string[]>>({})
const [runoff2Matrix,   setRunoff2Matrix]   = useState<Record<string, string[]>>({})
const [normalVoteOrder, setNormalVoteOrder] = useState<Record<number, string>>({})
const [showRunoff2,     setShowRunoff2]     = useState(false)
const [submitting,      setSubmitting]      = useState<'normal'|'runoff'|'runoff2'|null>(null)
// 決選吊りが今日あるか
const hasRunoffExecution = executions.some(
  e => e.day_number === day && e.execution_type === 'runoff_execution'
)
　const [voteOrderInput, setVoteOrderInput] = useState<Record<number, string>>({})
  const [vVoterInput,   setVVoterInput]   = useState('')
  const [vTargetInput,  setVTargetInput]  = useState('')
  const [vType,         setVType]         = useState('normal')
  const [vVoteOrder,    setVVoteOrder]    = useState('')
  const [vReceiveOrder, setVReceiveOrder] = useState('')
  const [vIsDiscard,    setVIsDiscard]    = useState(false)
  const [showNames, setShowNames] = useState(false)

  const loadVotes = () =>
    api.get<Vote[]>(`/votes/game/${gameId}/day/${day}`).then(setVotes)

  useEffect(() => { loadVotes() }, [gameId, day])

  useEffect(() => {
    if (voteInputMode !== 'table') return
  const nm: Record<string, string[]> = {}
  const rm: Record<string, string[]> = {}
  const r2m: Record<string, string[]> = {}
  const order: Record<number, string> = {}
  for (const v of votes) {
    const voterNum = participants.find(p => p.id === v.voter_id)?.participant_number
    if (voterNum == null) continue
    const target = String(v.target_id)
    if (v.vote_type === 'normal') {
      nm[target] = [...(nm[target] ?? []), String(voterNum)]
      if (v.vote_order != null) order[v.voter_id] = String(v.vote_order)
    } else if (v.vote_type === 'runoff') {
      rm[target] = [...(rm[target] ?? []), String(voterNum)]
    } else if (v.vote_type === 'runoff2') {
      r2m[target] = [...(r2m[target] ?? []), String(voterNum)]
    }
  }
  setNormalMatrix(nm); setRunoffMatrix(rm); setRunoff2Matrix(r2m)
  setNormalVoteOrder(order)
  if (votes.some(v => v.vote_type === 'runoff2')) setShowRunoff2(true)
}, [votes, voteInputMode])

// submit を汎用化（matrixType ごとに呼ぶ）
const makeSubmitter = (
  voteType: 'normal' | 'runoff' | 'runoff2',
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
        const voter = resolveParticipant(voterNumStr.trim())
        if (!voter) { alert(`「${voterNumStr}」が見つかりません`); return }
        const orderStr = voteOrderData[voter.id]
        toSubmit.push({
          game_id: Number(gameId), day_number: day, vote_type: voteType,
          voter_id: voter.id, target_id: Number(targetIdStr),
          vote_order: (day === 1 && voteType === 'normal' && orderStr?.trim()) ? Number(orderStr) : null,
          receive_order: null,
        })
      }
    }
    await api.post('/votes/replace', {
      game_id: Number(gameId), day_number: day, vote_type: voteType, votes: toSubmit,
    })
    await loadVotes()
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



  return (
    <div className="card" id="vote-section">
      <h2 style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
  {day}日目：投票
  <button
    type="button" className="secondary"
    style={{ fontSize: 12, padding: '2px 10px' }}
    onClick={() => setVoteInputMode(m => m === 'form' ? 'table' : 'form')}
  >
    {voteInputMode === 'form' ? '表入力に切替' : 'フォーム入力に切替'}
  </button>
  <button
    type="button" className="secondary"
    style={{ fontSize: 12, padding: '2px 10px' }}
    onClick={() => setShowNames(v => !v)}
  >
    {showNames ? '名前を非表示' : '名前を表示'}
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
  <>
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
    {hasRunoffExecution && (
      <>
        <hr style={{ margin: '12px 0' }} />
        <VoteMatrixInput
          title="決選投票"
          participants={participants}
          matrixInput={runoffMatrix}
          setMatrixInput={setRunoffMatrix}
          onSubmit={makeSubmitter('runoff', runoffMatrix)}
          submitting={submitting === 'runoff'}
          day={day}
          voteOrderInput={{}}
          setVoteOrderInput={() => {}}
        />
        {!showRunoff2 ? (
          <button className="secondary"
            style={{ fontSize: 12, marginTop: 8 }}
            onClick={() => setShowRunoff2(true)}>
            ＋ 2回目決選投票を追加
          </button>
        ) : (
          <>
            <hr style={{ margin: '12px 0' }} />
            <VoteMatrixInput
              title="2回目決選投票"
              participants={participants}
              matrixInput={runoff2Matrix}
              setMatrixInput={setRunoff2Matrix}
              onSubmit={makeSubmitter('runoff2', runoff2Matrix)}
              submitting={submitting === 'runoff2'}
              day={day}
              voteOrderInput={{}}
              setVoteOrderInput={() => {}}
            />
          </>
        )}
      </>
    )}
  </>
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

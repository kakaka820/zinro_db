import { useState, useEffect } from 'react'
import { api } from '../api'
import VoteMatrixInput from './VoteMatrixInput'
import type { Participant, Vote, Execution } from '../types'

type Props = {
  gameId:       string
  participants: Participant[]
  day:          number
  executions:   Execution[]
  votes:        Vote[]
  onRefresh:    () => void
}

// 「決選投票」の入力欄。吊り結果が「決選釣り」になった日にだけ、
// 吊り結果セクションの下に表示する（投票セクションからは分離）。
export default function RunoffVoteSection({ gameId, participants, day, executions, votes, onRefresh }: Props) {
  const [runoffMatrix,  setRunoffMatrix]  = useState<Record<string, string[]>>({})
  const [runoff2Matrix, setRunoff2Matrix] = useState<Record<string, string[]>>({})
  const [showRunoff2,   setShowRunoff2]   = useState(false)
  const [submitting,    setSubmitting]    = useState<'runoff' | 'runoff2' | null>(null)

  const hasRunoffExecution = executions.some(
    e => e.day_number === day && e.execution_type === 'runoff_execution'
  )

  useEffect(() => {
    const rm: Record<string, string[]> = {}
    const r2m: Record<string, string[]> = {}
    for (const v of votes) {
      const voterNum = participants.find(p => p.id === v.voter_id)?.participant_number
      if (voterNum == null) continue
      const target = String(v.target_id)
      if (v.vote_type === 'runoff') {
        rm[target] = [...(rm[target] ?? []), String(voterNum)]
      } else if (v.vote_type === 'runoff2') {
        r2m[target] = [...(r2m[target] ?? []), String(voterNum)]
      }
    }
    setRunoffMatrix(rm); setRunoff2Matrix(r2m)
    if (votes.some(v => v.vote_type === 'runoff2')) setShowRunoff2(true)
  }, [votes, participants])

  const resolveParticipant = (input: string) => {
    const trimmed = input.trim()
    const num = parseInt(trimmed, 10)
    if (!isNaN(num) && String(num) === trimmed)
      return participants.find(p => p.participant_number === num) ?? null
    return participants.find(p => p.player_name === trimmed) ?? null
  }

  const makeSubmitter = (
    voteType: 'runoff' | 'runoff2',
    matrixData: Record<string, string[]>,
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
          toSubmit.push({
            game_id: Number(gameId), day_number: day, vote_type: voteType,
            voter_id: voter.id, target_id: Number(targetIdStr),
            vote_order: null, receive_order: null,
          })
        }
      }
      await api.post('/votes/replace', {
        game_id: Number(gameId), day_number: day, vote_type: voteType, votes: toSubmit,
      })
      onRefresh()
    } finally {
      setSubmitting(null)
    }
  }

  if (!hasRunoffExecution) return null

  return (
    <div className="card" id="runoff-vote-section">
      <h2>{day}日目：決選投票</h2>
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
        <button
          type="button" className="secondary"
          style={{ fontSize: 12, marginTop: 8 }}
          onClick={() => setShowRunoff2(true)}
        >
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
    </div>
  )
}

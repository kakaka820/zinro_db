import { useState } from 'react'
import { api } from '../api'
import type { Participant, Execution } from '../types'

type Props = {
  gameId:     string
  participants: Participant[]
  executions:  Execution[]
  day:         number
  onRefresh:   () => void
}

export default function ExecutionSection({ gameId, participants, executions, day, onRefresh }: Props) {
  const [eParticipantId, setEParticipantId] = useState('')
  const [eType,          setEType]          = useState('normal')

  const resolveParticipant = (input: string) => {
    const trimmed = input.trim()
    if (!trimmed) return null
    const num = parseInt(trimmed, 10)
    if (!isNaN(num) && String(num) === trimmed) {
      return participants.find(p => p.participant_number === num) ?? null
    }
    return participants.find(p => p.player_name === trimmed) ?? null
  }

  const addExecution = async (e: React.FormEvent) => {
    e.preventDefault()
    const target = eType === 'none' ? null : resolveParticipant(eParticipantId)
    if (eType !== 'none' && !target) {
      alert('吊られた人が見つかりません（番号か名前で入力してください）')
      return
    }
    await api.post('/executions', {
      game_id:        Number(gameId),
      day_number:     day,
      participant_id: target ? target.id : null,
      execution_type: eType,
    })
    setEParticipantId(''); setEType('normal')
    onRefresh()
  }

  return (
    <div className="card">
      <h2>{day}日目：吊り結果</h2>
      <form onSubmit={addExecution}>
        <select value={eType} onChange={e => setEType(e.target.value)}>
          <option value="normal">通常吊り</option>
          <option value="random">ランダム吊り</option>
          <option value="runoff_execution">決戦釣り</option>
          <option value="none">吊りなし</option>
        </select>
        {eType !== 'none' && (
          <input value={eParticipantId} onChange={e => setEParticipantId(e.target.value)}
            placeholder="吊られた人（番号or名前）" style={{ width: 200 }} required />
        )}
        <button type="submit">記録</button>
      </form>

      {executions.filter(e => e.day_number === day).length > 0 && (
        <table style={{ marginTop: 12 }}>
          <thead>
            <tr><th>種別</th><th>吊られた人</th></tr>
          </thead>
          <tbody>
            {executions.filter(e => e.day_number === day).map(e => (
              <tr key={e.id}>
                <td>
                  {e.execution_type === 'normal'             ? '通常吊り'
                    : e.execution_type === 'random'          ? 'ランダム吊り'
                    : e.execution_type === 'runoff_execution' ? '決戦釣り'
                    : '吊りなし'}
                </td>
                <td>{participants.find(p => String(p.id) === String(e.participant_id))?.player_name ?? '―'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

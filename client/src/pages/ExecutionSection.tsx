import { useState, forwardRef, useImperativeHandle } from 'react'
import { api } from '../api'
import type { Participant, Execution } from '../types'

type Props = {
  gameId:     string
  participants: Participant[]
  executions:  Execution[]
  day:         number
  onRefresh:   () => void
}

export type ExecutionSectionHandle = {
  flush: () => Promise<void>
}

const ExecutionSection = forwardRef<ExecutionSectionHandle, Props>(function ExecutionSection(
  { gameId, participants, executions, day, onRefresh }, ref
) {
  const [eParticipantId, setEParticipantId] = useState('')
  const [eType,          setEType]          = useState('normal')

  const [editingId,   setEditingId]   = useState<number | null>(null)
  const [editTargetId,setEditTargetId]= useState('')
  const [editType,    setEditType]    = useState('normal')

  const resolveParticipant = (input: string) => {
    const trimmed = input.trim()
    if (!trimmed) return null
    const num = parseInt(trimmed, 10)
    if (!isNaN(num) && String(num) === trimmed) {
      return participants.find(p => p.participant_number === num) ?? null
    }
    return participants.find(p => p.player_name === trimmed) ?? null
  }

  // 「番号.名前」形式で表示する（番号が無ければ名前のみ）
  const formatParticipant = (p?: Participant | null) => {
    if (!p) return '―'
    return p.participant_number != null ? `${p.participant_number}.${p.player_name}` : p.player_name
  }

  const submitExecution = async () => {
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



useImperativeHandle(ref, () => ({
  async flush() {
    // デフォルト（通常吊り・未入力）のままなら「まだ何も入力していない」とみなして何もしない
    const hasPendingInput = eType !== 'normal' || eParticipantId.trim() !== ''
    if (!hasPendingInput) return
    await submitExecution()
  },
}))

  
  const startEdit = (e: Execution) => {
    setEditingId(e.id)
    setEditType(e.execution_type)
    const p = participants.find(p => String(p.id) === String(e.participant_id))
    setEditTargetId(p?.participant_number != null ? String(p.participant_number) : (p?.player_name ?? ''))
  }

  const saveEdit = async (id: number) => {
    const target = editType === 'none' ? null : resolveParticipant(editTargetId)
    if (editType !== 'none' && !target) {
      alert('吊られた人が見つかりません（番号か名前で入力してください）')
      return
    }
    await api.put(`/executions/${id}`, {
      participant_id: target ? target.id : null,
      execution_type: editType,
    })
    setEditingId(null)
    onRefresh()
  }

  const deleteExecution = async (id: number) => {
    if (!window.confirm('この吊り結果を削除しますか？')) return
    await api.del(`/executions/${id}`)
    onRefresh()
  }

  return (
    <div className="card">
      <h2>{day}日目：吊り結果</h2>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={eType} onChange={e => setEType(e.target.value)}>
          <option value="normal">通常吊り</option>
          <option value="random">ランダム吊り</option>
          <option value="runoff_execution">決選吊り</option>
          <option value="none">吊りなし</option>
        </select>
        {eType !== 'none' && (
          <input value={eParticipantId} onChange={e => setEParticipantId(e.target.value)}
            placeholder="吊られた人（番号or名前）" style={{ width: 200 }} />
        )}
      </div>

      {executions.filter(e => e.day_number === day).length > 0 && (
        <table style={{ marginTop: 12 }}>
          <thead>
            <tr><th>種別</th><th>吊られた人</th><th></th></tr>
          </thead>
          <tbody>
            {executions.filter(e => e.day_number === day).map(e => (
              <tr key={e.id}>
                {editingId === e.id ? (
                  <>
                    <td>
                      <select value={editType} onChange={ev => setEditType(ev.target.value)}>
                        <option value="normal">通常吊り</option>
                        <option value="random">ランダム吊り</option>
                        <option value="runoff_execution">決選吊り</option>
                        <option value="none">吊りなし</option>
                      </select>
                    </td>
                    <td>
                      {editType !== 'none' && (
                        <input value={editTargetId} onChange={ev => setEditTargetId(ev.target.value)}
                          placeholder="吊られた人（番号or名前）" style={{ width: 180 }} />
                      )}
                    </td>
                    <td style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => saveEdit(e.id)}>保存</button>
                      <button className="secondary" onClick={() => setEditingId(null)}>キャンセル</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td>
                      {e.execution_type === 'normal'             ? '通常吊り'
                        : e.execution_type === 'random'          ? 'ランダム吊り'
                        : e.execution_type === 'runoff_execution' ? '決選吊り'
                        : '吊りなし'}
                    </td>
                    <td>{formatParticipant(participants.find(p => String(p.id) === String(e.participant_id)))}</td>
                    <td style={{ display: 'flex', gap: 4 }}>
                      <button className="secondary" onClick={() => startEdit(e)}>編集</button>
                      <button className="secondary" onClick={() => deleteExecution(e.id)}>削除</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
})

export default ExecutionSection

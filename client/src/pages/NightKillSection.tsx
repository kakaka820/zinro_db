import { useState, forwardRef, useImperativeHandle } from 'react'
import { api } from '../api'
import type { Participant, NightKill } from '../types'

type Props = {
  gameId:       string
  participants:  Participant[]
  nightKills:    NightKill[]
  day:           number
  onRefresh:     () => void
}

export type NightKillSectionHandle = {
  flush: () => Promise<void>
}

const NightKillSection = forwardRef<NightKillSectionHandle, Props>(function NightKillSection(
  { gameId, participants, nightKills, day, onRefresh }, ref
) {
  const [nParticipantId, setNParticipantId] = useState('')
  const [nIsGj,          setNIsGj]          = useState(false)

  const [editingId,   setEditingId]   = useState<number | null>(null)
  const [editTargetId,setEditTargetId]= useState('')
  const [editIsGj,     setEditIsGj]   = useState(false)

  const resolveParticipant = (input: string) => {
    const trimmed = input.trim()
    if (!trimmed) return null
    const num = parseInt(trimmed, 10)
    if (!isNaN(num) && String(num) === trimmed) {
      return participants.find(p => p.participant_number === num) ?? null
    }
    return participants.find(p => p.player_name === trimmed) ?? null
  }

  const submitNightKill = async () => {
    const target = (!nIsGj && nParticipantId.trim()) ? resolveParticipant(nParticipantId) : null
    await api.post('/night-kills', {
      game_id:        Number(gameId),
      day_number:     day,
      participant_id: target ? target.id : null,
    })

    if (nIsGj) {
      const knight = participants.find(p => p.role_name === '騎士')
      if (knight) {
        await api.post('/knight-guards', {
          game_id:               Number(gameId),
          knight_participant_id: knight.id,
          target_participant_id: null,
          day_number:            day,
          is_gj:                 true,
          disclosed_day:         null,
        })
        const coEvents = await api.get(`/co-events/game/${gameId}`)
        const knightCo = coEvents.find((c: { participant_id: number }) => c.participant_id === knight.id)
        if (knightCo) {
          await api.put(`/co-events/${knightCo.id}`, {
            claimed_role_id: knightCo.claimed_role_id,
            co_day:          day + 1,
          })
        }
      }
    }

    setNParticipantId('')
    setNIsGj(false)
    onRefresh()
  }

const addNightKill = (e: React.FormEvent) => {
  e.preventDefault()
  return submitNightKill()
}

useImperativeHandle(ref, () => ({
  async flush() {
    const hasPendingInput = nIsGj || nParticipantId.trim() !== ''
    if (!hasPendingInput) return
    await submitNightKill()
  },
}))
  
  const startEdit = (n: NightKill) => {
    setEditingId(n.id)
    if (n.participant_id == null) {
      setEditIsGj(true)
      setEditTargetId('')
    } else {
      setEditIsGj(false)
      const p = participants.find(p => String(p.id) === String(n.participant_id))
      setEditTargetId(p?.participant_number != null ? String(p.participant_number) : (p?.player_name ?? ''))
    }
  }

  const saveEdit = async (id: number) => {
    const target = (!editIsGj && editTargetId.trim()) ? resolveParticipant(editTargetId) : null
    if (!editIsGj && editTargetId.trim() && !target) {
      alert('噛まれた人が見つかりません（番号か名前で入力してください）')
      return
    }
    await api.put(`/night-kills/${id}`, {
      participant_id: target ? target.id : null,
    })
    setEditingId(null)
    onRefresh()
  }

  const deleteNightKill = async (id: number) => {
    if (!window.confirm('この噛み結果を削除しますか？')) return
    await api.del(`/night-kills/${id}`)
    onRefresh()
  }

  return (
    <div className="card">
      <h2>{day}日目：噛み結果</h2>
      <form onSubmit={addNightKill} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          value={nIsGj ? '' : nParticipantId}
          onChange={e => setNParticipantId(e.target.value)}
          placeholder={nIsGj ? '（GJ）' : '噛まれた人（番号or名前）'}
          disabled={nIsGj}
          style={{ width: 220 }}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
          <input type="checkbox" checked={nIsGj}
            onChange={e => { setNIsGj(e.target.checked); setNParticipantId('') }} />
          GJ
        </label>
        <button type="submit">記録</button>
      </form>

      {nightKills.filter(n => n.day_number === day).length > 0 && (
        <table style={{ marginTop: 12 }}>
          <thead>
            <tr><th>噛まれた人</th><th></th></tr>
          </thead>
          <tbody>
            {nightKills.filter(n => n.day_number === day).map(n => (
              <tr key={n.id}>
                {editingId === n.id ? (
                  <>
                    <td style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        value={editIsGj ? '' : editTargetId}
                        onChange={ev => setEditTargetId(ev.target.value)}
                        placeholder={editIsGj ? '（GJ）' : '噛まれた人（番号or名前）'}
                        disabled={editIsGj}
                        style={{ width: 180 }}
                      />
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                        <input type="checkbox" checked={editIsGj}
                          onChange={ev => { setEditIsGj(ev.target.checked); setEditTargetId('') }} />
                        GJ
                      </label>
                    </td>
                    <td style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => saveEdit(n.id)}>保存</button>
                      <button className="secondary" onClick={() => setEditingId(null)}>キャンセル</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td>{participants.find(p => String(p.id) === String(n.participant_id))?.player_name ?? 'GJ'}</td>
                    <td style={{ display: 'flex', gap: 4 }}>
                      <button className="secondary" onClick={() => startEdit(n)}>編集</button>
                      <button className="secondary" onClick={() => deleteNightKill(n.id)}>削除</button>
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

export default NightKillSection

import { useState } from 'react'
import { coEventsApi } from '../api'
import type { Participant, Role, CoEvent } from '../types'

type Props = {
  gameId: string | number
  participants: Participant[]
  roles: Role[]
  coEvents: CoEvent[]
  isFake: (co: CoEvent) => boolean
  onRefresh: () => void
}

export default function CoEventSection({
  gameId, participants, roles, coEvents, isFake, onRefresh,
}: Props) {
  // ── 追加フォーム ──
  const [coParticipantId, setCoParticipantId] = useState('')
  const [coClaimedRoleId, setCoClaimedRoleId] = useState('')
  const [coDay,           setCoDay]           = useState(1)
const [coTiming,     setCoTiming]     = useState<'runoff' | 'testament' | ''>('')
const [editCoTiming, setEditCoTiming] = useState<'runoff' | 'testament' | ''>('')

  // ── インライン編集 ──
  const [editingCoId,       setEditingCoId]       = useState<number | null>(null)
  const [editCoClaimedRole, setEditCoClaimedRole] = useState('')
  const [editCoDay,         setEditCoDay]         = useState('')

  const addCo = async (e: React.FormEvent) => {
    e.preventDefault()
    await coEventsApi.add({
      game_id:         Number(gameId),
      participant_id:  Number(coParticipantId),
      claimed_role_id: Number(coClaimedRoleId),
      co_day:          Number(coDay),
      co_timing:       coTiming || null,
    })
    setCoParticipantId(''); setCoClaimedRoleId(''); setCoDay(1); setCoTiming('')
    onRefresh()
  }

  const saveCo = async (co: CoEvent) => {
    await coEventsApi.update(co.id, {
      claimed_role_id: Number(editCoClaimedRole),
      co_day:          editCoDay ? Number(editCoDay) : null,
      co_timing:       editCoTiming || null,
    })
    setEditingCoId(null)
    onRefresh()
  }

  return (
    <div className="card">
      <h2>COを記録する</h2>

      <form onSubmit={addCo} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <select value={coParticipantId} onChange={e => setCoParticipantId(e.target.value)} required>
          <option value="">参加者を選択</option>
          {participants.map(p => (
            <option key={p.id} value={p.id}>
              {p.participant_number ? `${p.participant_number}. ` : ''}{p.player_name}
            </option>
          ))}
        </select>
        <select value={coClaimedRoleId} onChange={e => setCoClaimedRoleId(e.target.value)} required>
          <option value="">主張役職を選択</option>
          {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <label>
          CO日：
          <input type="number" min="1" value={coDay}
            onChange={e => setCoDay(Number(e.target.value))}
            style={{ width: 60 }} />
        </label>
<select value={coTiming} onChange={e => setCoTiming(e.target.value as any)}>
  <option value="">通常CO</option>
  <option value="runoff">決戦CO</option>
  <option value="testament">遺言CO</option>
</select>
        <button type="submit">記録</button>
      </form>

      {coEvents.length > 0 && (
        <table style={{ marginTop: 12 }}>
          <thead>
            <tr><th>参加者</th><th>主張役職</th><th>CO日</th><th>判定</th><th></th></tr>
          </thead>
          <tbody>
            {coEvents.map(co => (
              <tr key={co.id}>
                <td>{co.player_name}</td>
                <td>
                  {editingCoId === co.id ? (
                    <select value={editCoClaimedRole} onChange={e => setEditCoClaimedRole(e.target.value)}>
                      {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  ) : co.claimed_role_name}
                </td>
                <td>
                  {editingCoId === co.id ? (
                <>
                    <input type="number" min="1" value={editCoDay}
                      onChange={e => setEditCoDay(e.target.value)}
                      placeholder="未COは空欄" style={{ width: 80 }} />
                   <select value={editCoTiming} onChange={e => setEditCoTiming(e.target.value as any)}>
                        <option value="">通常CO</option>
                        <option value="runoff">決戦CO</option>
                        <option value="testament">遺言CO</option>
                      </select>
                    </>
                  ) : (
                    <>
                      {co.co_day != null
                        ? co.co_timing === 'runoff'   ? `${co.co_day}日目（決戦CO）`
                        : co.co_timing === 'testament' ? `${co.co_day}日目（遺言CO）`
                        : `${co.co_day}日目`
                        : '未CO'}
                    </>
                  )}
                </td>
                <td>{isFake(co) ? '⚠️ 偽CO' : '本物'}</td>
                <td style={{ display: 'flex', gap: 4 }}>
                  {editingCoId === co.id ? (
                    <>
                      <button onClick={() => saveCo(co)}>保存</button>
                      <button className="secondary" onClick={() => setEditingCoId(null)}>
                        キャンセル
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="secondary" onClick={() => {
                        setEditingCoId(co.id)
                        setEditCoClaimedRole(String(co.claimed_role_id))
                        setEditCoDay(co.co_day != null ? String(co.co_day) : '')
                        setEditCoTiming((co.co_timing ?? '') as any)
                      }}>編集</button>
                      <button className="secondary" onClick={async () => {
                        await coEventsApi.del(co.id)
                        onRefresh()
                      }}>削除</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

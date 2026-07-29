import { useState, useEffect } from 'react'
import { seerResultsApi } from '../api'
import type { Participant, CoEvent, SeerResult } from '../types'

type Props = {
  gameId: string | number
  participants: Participant[]
  coEvents: CoEvent[]
  seers: CoEvent[]
  seerResults: SeerResult[]
  isFake: (co: CoEvent) => boolean
  onRefresh: () => void
}

export default function SeerSection({
  gameId, participants, coEvents, seers, seerResults, isFake, onRefresh,
}: Props) {
  // ── 追加フォーム ──
  const [seerCoId,         setSeerCoId]         = useState('')
  const [seerTargetInput,  setSeerTargetInput]  = useState('')
  const [seerDay,          setSeerDay]          = useState(1)
  const [seerResult,       setSeerResult]       = useState<'white' | 'black'>('white')
  const [seerDisclosedDay, setSeerDisclosedDay] = useState('')

  // ── インライン編集 ──
  const [editingSeerId,        setEditingSeerId]        = useState<number | null>(null)
  const [editSeerResult,       setEditSeerResult]       = useState<'white' | 'black'>('white')
  const [editSeerDisclosedDay, setEditSeerDisclosedDay] = useState('')

  // 本物の占い師COを自動選択
  useEffect(() => {
    const real = seers.find(co => !isFake(co))
    if (!real) return
    setSeerCoId(String(real.id))
    if (real.co_day != null) setSeerDisclosedDay(d => d || String(real.co_day))
  }, [seers])

  const resolve = (input: string) => {
    const trimmed = input.trim()
    if (!trimmed) return null
    const num = parseInt(trimmed, 10)
    if (!isNaN(num) && String(num) === trimmed)
      return participants.find(p => p.participant_number === num) ?? null
    return participants.find(p => p.player_name === trimmed) ?? null
  }

  const addSeerResult = async (e: React.FormEvent) => {
    e.preventDefault()
    const target = resolve(seerTargetInput)
    if (!target) return alert('占い対象が見つかりません')
    const co = coEvents.find(c => c.id === Number(seerCoId))
    if (!co) return alert('COを選択してください')
    await seerResultsApi.add({
      game_id:               Number(gameId),
      seer_participant_id:   co.participant_id,
      target_participant_id: target.id,
      day_number:            Number(seerDay),
      result:                seerResult,
      disclosed_day:         seerDisclosedDay ? Number(seerDisclosedDay) : null,
    })
    setSeerTargetInput(''); setSeerDay(1); setSeerResult('white'); setSeerDisclosedDay('')
    onRefresh()
  }

  if (seers.length === 0) {
    return (
      <div className="card">
        <h2>占い師CO</h2>
        <p style={{ color: '#888' }}>占い師COなし</p>
      </div>
    )
  }

  return (
    <div className="card">
      <h2>占い師CO</h2>

      <form onSubmit={addSeerResult} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <select value={seerCoId} onChange={e => {
          const newCoId = e.target.value
          setSeerCoId(newCoId)
          const co = coEvents.find(c => c.id === Number(newCoId))
          if (co) setSeerDisclosedDay(String(Math.max(co.co_day ?? 1, Number(seerDay) || 1)))
        }} required>
          {seers.map(co => (
            <option key={co.id} value={co.id}>
              {co.player_name}（{co.co_day != null ? `${co.co_day}日目CO` : '未CO'}）{isFake(co) ? ' ⚠️偽' : ''}
            </option>
          ))}
        </select>
        <input value={seerTargetInput} onChange={e => setSeerTargetInput(e.target.value)}
          placeholder="占い対象（番号or名前）" style={{ width: 180 }} required />
        <label>
          占った日：
          <input type="number" min="1" value={seerDay}
            onChange={e => {
              const newDay = e.target.value
              setSeerDay(Number(newDay))
              const co = coEvents.find(c => c.id === Number(seerCoId))
              if (co && newDay) setSeerDisclosedDay(String(Math.max(co.co_day ?? 1, Number(newDay))))
            }} style={{ width: 55 }} />
        </label>
        <select value={seerResult} onChange={e => setSeerResult(e.target.value as 'white' | 'black')}>
          <option value="white">白</option>
          <option value="black">黒</option>
        </select>
        <label>
          開示日：
          <input type="number" min="1" value={seerDisclosedDay}
            onChange={e => setSeerDisclosedDay(e.target.value)}
            placeholder="未開示は空欄" style={{ width: 90 }} />
        </label>
        <button type="submit">追加</button>
      </form>

      {seerResults.length > 0 && (
        <table style={{ marginTop: 12 }}>
          <thead>
            <tr><th>占い師</th><th>対象</th><th>占い日</th><th>結果</th><th>開示日</th><th></th></tr>
          </thead>
          <tbody>
            {seerResults.map(r => (
              <tr key={r.id} style={{ opacity: r.disclosed_day ? 1 : 0.6 }}>
                <td>{r.seer_name}</td>
                <td>{r.target_name}</td>
                <td>{r.day_number}日目</td>
                <td style={{ color: r.result === 'black' ? '#c00' : '#080', fontWeight: 'bold' }}>
                  {editingSeerId === r.id ? (
                    <select value={editSeerResult}
                      onChange={e => setEditSeerResult(e.target.value as 'white' | 'black')}>
                      <option value="white">白</option>
                      <option value="black">黒</option>
                    </select>
                  ) : (r.result === 'black' ? '黒' : '白')}
                </td>
                <td>
                  {editingSeerId === r.id ? (
                    <input type="number" min="1" value={editSeerDisclosedDay}
                      onChange={e => setEditSeerDisclosedDay(e.target.value)}
                      placeholder="未開示は空欄" style={{ width: 90 }} />
                  ) : (r.disclosed_day ? `${r.disclosed_day}日目` : '未開示')}
                </td>
                <td style={{ display: 'flex', gap: 4 }}>
                  {editingSeerId === r.id ? (
                    <>
                      <button onClick={async () => {
                        await seerResultsApi.update(r.id, {
                          result:        editSeerResult,
                          disclosed_day: editSeerDisclosedDay ? Number(editSeerDisclosedDay) : null,
                        })
                        setEditingSeerId(null)
                        onRefresh()
                      }}>保存</button>
                      <button className="secondary" onClick={() => setEditingSeerId(null)}>
                        キャンセル
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="secondary" onClick={() => {
                        setEditingSeerId(r.id)
                        setEditSeerResult(r.result)
                        setEditSeerDisclosedDay(r.disclosed_day != null ? String(r.disclosed_day) : '')
                      }}>編集</button>
                      <button className="secondary" onClick={async () => {
                        await seerResultsApi.del(r.id)
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

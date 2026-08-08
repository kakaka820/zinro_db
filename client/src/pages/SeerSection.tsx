import { useState, useEffect, useRef } from 'react'
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
  // 参加者IDから番号を引く
  const getNum = (participantId: number) =>
    participants.find(p => p.id === participantId)?.participant_number ?? '?'

  // ── 保存メッセージ ──
  const [saveMessage, setSaveMessage] = useState('')
  const saveMessageTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const showSaveMessage = () => {
    if (saveMessageTimer.current) clearTimeout(saveMessageTimer.current)
    setSaveMessage('保存しました！')
    saveMessageTimer.current = setTimeout(() => setSaveMessage(''), 3000)
  }

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

  // 本物の占い師COを自動選択（すでに有効な選択がある場合は上書きしない＝偽COも選び続けられる）
  useEffect(() => {
    if (seerCoId && seers.some(co => String(co.id) === seerCoId)) return
    const real = seers.find(co => !isFake(co))
    if (!real) return
    setSeerCoId(String(real.id))
    
    // この占い師の既存結果の最大日 + 1 をデフォルトにする
   const maxDay = seerResults
     .filter(r => r.seer_participant_id === real.participant_id)
     .reduce((m, r) => Math.max(m, r.day_number), 0)
const nextDay = maxDay + 1
   setSeerDay(nextDay)
   // 開示日はCO日と占った日の遅い方をデフォルトにする
   setSeerDisclosedDay(d => d || String(Math.max(real.co_day ?? 1, nextDay)))
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
    const usedDay = Number(seerDay)
    await seerResultsApi.add({
      game_id:               Number(gameId),
      seer_participant_id:   co.participant_id,
      target_participant_id: target.id,
      day_number:            usedDay,
      result:                seerResult,
      disclosed_day:         seerDisclosedDay ? Number(seerDisclosedDay) : null,
    })
    // 真偽問わず、追加した日の次の日を自動セット（開示日も連動）
    const nextDay = usedDay + 1
    setSeerTargetInput(''); setSeerResult('white')
    setSeerDay(nextDay)
    setSeerDisclosedDay(String(Math.max(co.co_day ?? 1, nextDay)))
    showSaveMessage()
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
      <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        占い師CO
        {saveMessage && (
          <span style={{ color: '#080', fontWeight: 'bold', fontSize: 14 }}>{saveMessage}</span>
        )}
      </h2>

      <form onSubmit={addSeerResult} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <select value={seerCoId} onChange={e => {
          const newCoId = e.target.value
          setSeerCoId(newCoId)
          const co = coEvents.find(c => c.id === Number(newCoId))
          if (co) {
     const maxDay = seerResults
       .filter(r => r.seer_participant_id === co.participant_id)
       .reduce((m, r) => Math.max(m, r.day_number), 0)
     const nextDay = maxDay + 1
     setSeerDay(nextDay)
     setSeerDisclosedDay(String(Math.max(co.co_day ?? 1, nextDay)))
   }
        }} required>
          {seers.map(co => (
            <option key={co.id} value={co.id}>
              {co.participant_number ?? getNum(co.participant_id)}番（{co.co_day != null ? `${co.co_day}日目CO` : '未CO'}）{isFake(co) ? ' ⚠️偽' : ''}
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
                <td>{getNum(r.seer_participant_id)}番</td>
                <td>{getNum(r.target_participant_id)}番</td>
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

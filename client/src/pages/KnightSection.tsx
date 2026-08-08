import { useState, useEffect, useRef } from 'react'
import { knightGuardsApi } from '../api'
import type { Participant, CoEvent, KnightGuard } from '../types'

type Props = {
  gameId: string | number
  participants: Participant[]
  coEvents: CoEvent[]
  knights: CoEvent[]
  knightGuards: KnightGuard[]
  isFake: (co: CoEvent) => boolean
  onRefresh: () => void
}

export default function KnightSection({
  gameId, participants, coEvents, knights, knightGuards, isFake, onRefresh,
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
  const [knightCoId,         setKnightCoId]         = useState('')
  const [knightTargetInput,  setKnightTargetInput]  = useState('')
  const [knightDay,          setKnightDay]          = useState(1)
  const [knightIsGj,         setKnightIsGj]         = useState(false)
  const [knightDisclosedDay, setKnightDisclosedDay] = useState('')

  // ── インライン編集 ──
  const [editingKnightId,        setEditingKnightId]        = useState<number | null>(null)
  const [editKnightTargetInput,  setEditKnightTargetInput]  = useState('')
  const [editKnightIsGj,         setEditKnightIsGj]         = useState(false)
  const [editKnightDisclosedDay, setEditKnightDisclosedDay] = useState('')

  // 本物の騎士COを自動選択（すでに有効な選択がある場合は上書きしない＝偽COも選び続けられる）
  useEffect(() => {
    if (knightCoId && knights.some(co => String(co.id) === knightCoId)) return
    const real = knights.find(co => !isFake(co))
    if (!real) return
    setKnightCoId(String(real.id))
    // この騎士の既存記録の最大護衛日 + 1 をデフォルトにする（真偽問わず）
    const maxDay = knightGuards
      .filter(g => g.knight_participant_id === real.participant_id)
      .reduce((m, g) => Math.max(m, g.day_number), 0)
    setKnightDay(maxDay + 1)
  }, [knights])

  const resolve = (input: string) => {
    const trimmed = input.trim()
    if (!trimmed) return null
    const num = parseInt(trimmed, 10)
    if (!isNaN(num) && String(num) === trimmed)
      return participants.find(p => p.participant_number === num) ?? null
    return participants.find(p => p.player_name === trimmed) ?? null
  }

  const addKnightGuard = async (e: React.FormEvent) => {
    e.preventDefault()
    const target = knightTargetInput.trim() ? resolve(knightTargetInput) : null
    const co = coEvents.find(c => c.id === Number(knightCoId))
    if (!co) return alert('COを選択してください')
    const usedDay = Number(knightDay)
    await knightGuardsApi.add({
      game_id:               Number(gameId),
      knight_participant_id: co.participant_id,
      target_participant_id: target ? target.id : null,
      day_number:            usedDay,
      is_gj:                 knightIsGj,
      disclosed_day:         knightDisclosedDay ? Number(knightDisclosedDay) : null,
    })
    // 真偽問わず、追加した護衛日の次を自動セット
    setKnightTargetInput(''); setKnightIsGj(false); setKnightDisclosedDay('')
    setKnightDay(usedDay + 1)
    showSaveMessage()
    onRefresh()
  }

  // 現在プルダウンで選択中のCOに絞り込んで表示する
  const selectedKnightCo = coEvents.find(c => c.id === Number(knightCoId))
  const visibleKnightGuards = selectedKnightCo
    ? knightGuards.filter(g => g.knight_participant_id === selectedKnightCo.participant_id)
    : knightGuards

  if (knights.length === 0) {
    return (
      <div className="card">
        <h2>騎士CO</h2>
        <p style={{ color: '#888' }}>騎士COなし</p>
      </div>
    )
  }

  return (
    <div className="card">
      <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        騎士CO
        {saveMessage && (
          <span style={{ color: '#080', fontWeight: 'bold', fontSize: 14 }}>{saveMessage}</span>
        )}
      </h2>

      <form onSubmit={addKnightGuard} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <select value={knightCoId} onChange={e => {
          const newCoId = e.target.value
          setKnightCoId(newCoId)
          const co = coEvents.find(c => c.id === Number(newCoId))
          if (co) {
            // このCO（真偽問わず）の既存記録の最大護衛日 + 1 をデフォルトにする
            const maxDay = knightGuards
              .filter(g => g.knight_participant_id === co.participant_id)
              .reduce((m, g) => Math.max(m, g.day_number), 0)
            setKnightDay(maxDay + 1)
          }
        }} required>
          {knights.map(co => (
            <option key={co.id} value={co.id}>
              {co.participant_number ?? getNum(co.participant_id)}番（{co.co_day != null ? `${co.co_day}日目CO` : '未CO'}）{isFake(co) ? ' ⚠️偽' : ''}
            </option>
          ))}
        </select>
        <input value={knightTargetInput} onChange={e => setKnightTargetInput(e.target.value)}
          placeholder="護衛対象（空欄＝不明）" style={{ width: 190 }} />
        <label>
          護衛日：
          <input type="number" min="1" value={knightDay}
            onChange={e => setKnightDay(Number(e.target.value))}
            style={{ width: 55 }} />
        </label>
        <label>
          <input type="checkbox" checked={knightIsGj}
            onChange={e => setKnightIsGj(e.target.checked)} />
          　GJ
        </label>
        <label>
          開示日：
          <input type="number" min="1" value={knightDisclosedDay}
            onChange={e => setKnightDisclosedDay(e.target.value)}
            placeholder="未開示は空欄" style={{ width: 90 }} />
        </label>
        <button type="submit">追加</button>
      </form>

      {visibleKnightGuards.length > 0 && (
        <table style={{ marginTop: 12 }}>
          <thead>
            <tr><th>騎士</th><th>護衛対象</th><th>護衛日</th><th>GJ</th><th>開示日</th><th></th></tr>
          </thead>
          <tbody>
            {visibleKnightGuards.map(g => (
              <tr key={g.id} style={{ opacity: g.disclosed_day ? 1 : 0.6 }}>
                <td>{getNum(g.knight_participant_id)}番</td>
                <td>
                  {editingKnightId === g.id ? (
                    <input value={editKnightTargetInput}
                      onChange={e => setEditKnightTargetInput(e.target.value)}
                      placeholder="護衛対象（空欄＝不明）" style={{ width: 150 }} />
                  ) : (g.target_participant_id ? `${getNum(g.target_participant_id)}番` : '不明')}
                </td>
                <td>{g.day_number}日目</td>
                <td>
                  {editingKnightId === g.id ? (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input type="checkbox" checked={editKnightIsGj}
                        onChange={e => setEditKnightIsGj(e.target.checked)} />
                      GJ
                    </label>
                  ) : (g.is_gj ? '✅ GJ' : '―')}
                </td>
                <td>
                  {editingKnightId === g.id ? (
                    <input type="number" min="1" value={editKnightDisclosedDay}
                      onChange={e => setEditKnightDisclosedDay(e.target.value)}
                      placeholder="未開示は空欄" style={{ width: 90 }} />
                  ) : (g.disclosed_day ? `${g.disclosed_day}日目` : '未開示')}
                </td>
                <td style={{ display: 'flex', gap: 4 }}>
                  {editingKnightId === g.id ? (
                    <>
                      <button onClick={async () => {
                        const target = editKnightTargetInput.trim() ? resolve(editKnightTargetInput) : null
                        await knightGuardsApi.update(g.id, {
                          target_participant_id: target ? target.id : null,
                          is_gj:                 editKnightIsGj,
                          disclosed_day:         editKnightDisclosedDay ? Number(editKnightDisclosedDay) : null,
                        })
                        setEditingKnightId(null)
                        onRefresh()
                      }}>保存</button>
                      <button className="secondary" onClick={() => setEditingKnightId(null)}>
                        キャンセル
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="secondary" onClick={() => {
                        setEditingKnightId(g.id)
                        setEditKnightTargetInput(g.target_participant_id ? String(getNum(g.target_participant_id)) : '')
                        setEditKnightIsGj(g.is_gj)
                        setEditKnightDisclosedDay(g.disclosed_day != null ? String(g.disclosed_day) : '')
                      }}>編集</button>
                      <button className="secondary" onClick={async () => {
                        await knightGuardsApi.del(g.id)
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

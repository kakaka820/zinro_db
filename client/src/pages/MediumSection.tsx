import { useState, useEffect, useRef } from 'react'
import { mediumResultsApi } from '../api'
import type { Participant, CoEvent, MediumResult, Execution, NightKill } from '../types'

type Props = {
  gameId: string | number
  participants: Participant[]
  coEvents: CoEvent[]
  mediums: CoEvent[]
  mediumResults: MediumResult[]
  executions: Execution[]
  nightKills: NightKill[]
  isFake: (co: CoEvent) => boolean
  onRefresh: () => void
}

export default function MediumSection({
  gameId, participants, coEvents, mediums, mediumResults,
  executions, nightKills, isFake, onRefresh,
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
  const [mediumCoId,         setMediumCoId]         = useState('')
  const [mediumTargetInput,  setMediumTargetInput]  = useState('')
  const [mediumDay,          setMediumDay]          = useState(1)
  const [mediumResult,       setMediumResult]       = useState<'white' | 'black'>('white')
  const [mediumDisclosedDay, setMediumDisclosedDay] = useState('')

  // ── インライン編集 ──
  const [editingMediumId,        setEditingMediumId]        = useState<number | null>(null)
  const [editMediumResult,       setEditMediumResult]       = useState<'white' | 'black'>('white')
  const [editMediumDisclosedDay, setEditMediumDisclosedDay] = useState('')

  // 本物の霊媒師COを自動選択（すでに有効な選択がある場合は上書きしない＝偽COも選び続けられる）
  useEffect(() => {
    if (mediumCoId && mediums.some(co => String(co.id) === mediumCoId)) return
    const real = mediums.find(co => !isFake(co))
    if (!real) return
    setMediumCoId(String(real.id))
    // この霊媒師の既存結果の最大処刑日 + 1 をデフォルトにする（真偽問わず）
    const maxDay = mediumResults
      .filter(r => r.medium_participant_id === real.participant_id)
      .reduce((m, r) => Math.max(m, r.day_number), 0)
    const nextDay = maxDay + 1
    setMediumDay(nextDay)
    // 開示日はCO日と処刑日の遅い方をデフォルトにする
    setMediumDisclosedDay(d => d || String(Math.max(real.co_day ?? 1, nextDay + 1)))
  }, [mediums])

// 霊媒結果を自動記入（真霊媒のみ）
// ※ CO自動追加（needs_co）がOFFでも動くよう、co_eventsではなく
//   参加者の本物の役職から直接「本物の霊媒師」を特定する。
useEffect(() => {
  if (!executions.length) return

  const realMedium = participants.find(p => p.role_name === '霊媒師')
  if (!realMedium) return

  // 霊媒師自身の死亡日（吊り・噛みのうち早い方）。生存中なら Infinity。
  const deathDay = Math.min(
    ...executions.filter(e => e.participant_id === realMedium.id).map(e => e.day_number),
    ...nightKills.filter(n => n.participant_id === realMedium.id).map(n => n.day_number),
    Infinity,
  )

  const autoFill = async () => {
    let inserted = false
    for (const execution of executions) {
      // 開示日 = 処刑日 + 1
      const disclosed_day = execution.day_number + 1

      // 開示日の時点で霊媒師本人がすでに死亡している場合は、
      // 村に情報が伝わらないため自動記入しない
      if (disclosed_day > deathDay) continue

      // すでにこの処刑日の記録があればスキップ
      const alreadyExists = mediumResults.some(
        mr => mr.medium_participant_id === realMedium.id &&
              mr.day_number === execution.day_number
      )
      if (alreadyExists) continue

      // 処刑された参加者のチームを取得
      const target = participants.find(p => p.id === execution.participant_id)
      if (!target) continue

      // 結果判定：狼陣営なら黒、それ以外は白
      const result: 'white' | 'black' = target.team === 'wolf' ? 'black' : 'white'

      try {
        await mediumResultsApi.add({
          game_id:               Number(gameId),
          medium_participant_id: realMedium.id,
          target_participant_id: target.id,
          day_number:            execution.day_number,
          disclosed_day,
          result,
        })
        inserted = true
      } catch (err) {
        console.error('霊媒結果の自動記入に失敗しました', err)
      }
    }
    // 実際に何か追加した時だけ再読み込みする（無限ループ防止）
    if (inserted) onRefresh()
  }

  autoFill()
}, [executions, nightKills, mediumResults, participants])


  const resolve = (input: string) => {
    const trimmed = input.trim()
    if (!trimmed) return null
    const num = parseInt(trimmed, 10)
    if (!isNaN(num) && String(num) === trimmed)
      return participants.find(p => p.participant_number === num) ?? null
    return participants.find(p => p.player_name === trimmed) ?? null
  }

  const addMediumResult = async (e: React.FormEvent) => {
    e.preventDefault()
    const target = resolve(mediumTargetInput)
    if (!target) return alert('霊媒対象が見つかりません')
    const co = coEvents.find(c => c.id === Number(mediumCoId))
    if (!co) return alert('COを選択してください')
    const usedDay = Number(mediumDay)
    await mediumResultsApi.add({
      game_id:               Number(gameId),
      medium_participant_id: co.participant_id,
      target_participant_id: target.id,
      day_number:            usedDay,
      result:                mediumResult,
      disclosed_day:         mediumDisclosedDay ? Number(mediumDisclosedDay) : null,
    })
    // 真偽問わず、追加した処刑日の次を自動セット（開示日も連動）
    const nextDay = usedDay + 1
    setMediumTargetInput(''); setMediumResult('white')
    setMediumDay(nextDay)
    setMediumDisclosedDay(String(Math.max(co.co_day ?? 1, nextDay + 1)))
    showSaveMessage()
    onRefresh()
  }

  // CO（co_events）が無くても、霊媒結果が自動記入されていれば表示する
  if (mediums.length === 0 && mediumResults.length === 0) {
    return (
      <div className="card">
        <h2>霊媒師CO</h2>
        <p style={{ color: '#888' }}>霊媒師COなし</p>
      </div>
    )
  }

  return (
    <div className="card">
      <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        霊媒師CO
        {saveMessage && (
          <span style={{ color: '#080', fontWeight: 'bold', fontSize: 14 }}>{saveMessage}</span>
        )}
      </h2>

      <form onSubmit={addMediumResult} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <select value={mediumCoId} onChange={e => {
          const newCoId = e.target.value
          setMediumCoId(newCoId)
          const co = coEvents.find(c => c.id === Number(newCoId))
          if (co) {
            // このCO（真偽問わず）の既存結果の最大処刑日 + 1 をデフォルトにする
            const maxDay = mediumResults
              .filter(r => r.medium_participant_id === co.participant_id)
              .reduce((m, r) => Math.max(m, r.day_number), 0)
            const nextDay = maxDay + 1
            setMediumDay(nextDay)
            setMediumDisclosedDay(String(Math.max(co.co_day ?? 1, nextDay + 1)))
          }
        }} required>
          {mediums.map(co => (
            <option key={co.id} value={co.id}>
              {co.participant_number ?? getNum(co.participant_id)}番（{co.co_day != null ? `${co.co_day}日目CO` : '未CO'}）{isFake(co) ? ' ⚠️偽' : ''}
            </option>
          ))}
        </select>
        <input value={mediumTargetInput} onChange={e => setMediumTargetInput(e.target.value)}
          placeholder="霊媒対象（処刑者・番号or名前）" style={{ width: 210 }} required />
        <label>
          処刑日：
          <input type="number" min="1" value={mediumDay}
            onChange={e => {
              const newDay = e.target.value
              setMediumDay(Number(newDay))
              const co = coEvents.find(c => c.id === Number(mediumCoId))
              if (co && newDay) setMediumDisclosedDay(String(Math.max(co.co_day ?? 1, Number(newDay) + 1)))
            }} style={{ width: 55 }} />
        </label>
        <select value={mediumResult} onChange={e => setMediumResult(e.target.value as 'white' | 'black')}>
          <option value="white">白</option>
          <option value="black">黒</option>
        </select>
        <label>
          開示日：
          <input type="number" min="1" value={mediumDisclosedDay}
            onChange={e => setMediumDisclosedDay(e.target.value)}
            placeholder="未開示は空欄" style={{ width: 90 }} />
        </label>
        <button type="submit">追加</button>
      </form>

      {mediumResults.length > 0 && (
        <table style={{ marginTop: 12 }}>
          <thead>
            <tr><th>霊媒師</th><th>対象</th><th>処刑日</th><th>結果</th><th>開示日</th><th></th></tr>
          </thead>
          <tbody>
            {mediumResults.map(r => (
              <tr key={r.id} style={{ opacity: r.disclosed_day ? 1 : 0.6 }}>
                <td>{getNum(r.medium_participant_id)}番</td>
                <td>{getNum(r.target_participant_id)}番</td>
                <td>{r.day_number}日目</td>
                <td style={{ color: r.result === 'black' ? '#c00' : '#080', fontWeight: 'bold' }}>
                  {editingMediumId === r.id ? (
                    <select value={editMediumResult}
                      onChange={e => setEditMediumResult(e.target.value as 'white' | 'black')}>
                      <option value="white">白</option>
                      <option value="black">黒</option>
                    </select>
                  ) : (r.result === 'black' ? '黒' : '白')}
                </td>
                <td>
                  {editingMediumId === r.id ? (
                    <input type="number" min="1" value={editMediumDisclosedDay}
                      onChange={e => setEditMediumDisclosedDay(e.target.value)}
                      placeholder="未開示は空欄" style={{ width: 90 }} />
                  ) : (r.disclosed_day ? `${r.disclosed_day}日目` : '未開示')}
                </td>
                <td style={{ display: 'flex', gap: 4 }}>
                  {editingMediumId === r.id ? (
                    <>
                      <button onClick={async () => {
                        await mediumResultsApi.update(r.id, {
                          result:        editMediumResult,
                          disclosed_day: editMediumDisclosedDay ? Number(editMediumDisclosedDay) : null,
                        })
                        setEditingMediumId(null)
                        onRefresh()
                      }}>保存</button>
                      <button className="secondary" onClick={() => setEditingMediumId(null)}>
                        キャンセル
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="secondary" onClick={() => {
                        setEditingMediumId(r.id)
                        setEditMediumResult(r.result)
                        setEditMediumDisclosedDay(r.disclosed_day != null ? String(r.disclosed_day) : '')
                      }}>編集</button>
                      <button className="secondary" onClick={async () => {
                        await mediumResultsApi.del(r.id)
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

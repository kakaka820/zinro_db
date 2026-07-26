import { useState, useEffect } from 'react'
import { coEventsApi, seerResultsApi, mediumResultsApi, knightGuardsApi } from '../api'

export default function COSection({ gameId, participants, roles }) {
  // ── データ ──
  const [coEvents,      setCoEvents]      = useState([])
  const [seerResults,   setSeerResults]   = useState([])
  const [mediumResults, setMediumResults] = useState([])
  const [knightGuards,  setKnightGuards]  = useState([])

  // ── COフォーム ──
  const [coParticipantId, setCoParticipantId] = useState('')
  const [coClaimedRoleId, setCoClaimedRoleId] = useState('')
  const [coDay,           setCoDay]           = useState(1)

  // ── CO編集 ──
  const [editingCoId,       setEditingCoId]       = useState(null)
  const [editCoClaimedRole, setEditCoClaimedRole] = useState('')
  const [editCoDay,         setEditCoDay]         = useState('')

  // ── 占いフォーム ──
  const [seerCoId,         setSeerCoId]         = useState('')  // どのCOか
  const [seerTargetInput,  setSeerTargetInput]  = useState('')
  const [seerDay,          setSeerDay]          = useState(1)
  const [seerResult,       setSeerResult]       = useState('white')
  const [seerDisclosedDay, setSeerDisclosedDay] = useState('')

  // ── 霊媒フォーム ──
  const [mediumCoId,         setMediumCoId]         = useState('')
  const [mediumTargetInput,  setMediumTargetInput]  = useState('')
  const [mediumDay,          setMediumDay]          = useState(1)
  const [mediumResult,       setMediumResult]       = useState('white')
  const [mediumDisclosedDay, setMediumDisclosedDay] = useState('')

  // ── 騎士フォーム ──
  const [knightCoId,         setKnightCoId]         = useState('')
  const [knightTargetInput,  setKnightTargetInput]  = useState('')
  const [knightDay,          setKnightDay]          = useState(1)
  const [knightIsGj,         setKnightIsGj]         = useState(false)
  const [knightDisclosedDay, setKnightDisclosedDay] = useState('')

  // ── ロード ──
  const load = () => {
    coEventsApi.list(gameId).then(setCoEvents)
    seerResultsApi.list(gameId).then(setSeerResults)
    mediumResultsApi.list(gameId).then(setMediumResults)
    knightGuardsApi.list(gameId).then(setKnightGuards)
  }
  useEffect(() => { load() }, [gameId])

  // 本物の役職を自動追加
useEffect(() => {
  if (!participants.length || !roles.length) return
  const autoAdd = async () => {
    const needsCoRoleIds = new Set(
      roles.filter(r => r.needs_co).map(r => r.id)
    )
    const current = await coEventsApi.list(gameId)
    const existingParticipantIds = new Set(current.map(c => c.participant_id))
    const toAdd = participants.filter(p =>
      needsCoRoleIds.has(p.role_id) && !existingParticipantIds.has(p.id)
    )
    for (const p of toAdd) {
      await coEventsApi.add({
        game_id:         Number(gameId),
        participant_id:  p.id,
        claimed_role_id: p.role_id,  // 本物なので実役職をそのままセット
        co_day:          null,
      })
    }
    if (toAdd.length > 0) load()
  }
  autoAdd()
}, [participants, roles])



  

  // 番号 or 名前 → participant解決（GameDetailと同じヘルパー）
  const resolve = (input) => {
    const trimmed = input.trim()
    if (!trimmed) return null
    const num = parseInt(trimmed, 10)
    if (!isNaN(num) && String(num) === trimmed)
      return participants.find(p => p.participant_number === num) ?? null
    return participants.find(p => p.player_name === trimmed) ?? null
  }

  // ── CO登録 ──
  const addCo = async (e) => {
    e.preventDefault()
    await coEventsApi.add({
      game_id:         Number(gameId),
      participant_id:  Number(coParticipantId),
      claimed_role_id: Number(coClaimedRoleId),
      co_day:          Number(coDay),
    })
    setCoParticipantId(''); setCoClaimedRoleId(''); setCoDay(1)
    load()
  }

  // ── 占い結果登録 ──
  const addSeerResult = async (e) => {
    e.preventDefault()
    const target = resolve(seerTargetInput)
    if (!target) return alert('占い対象が見つかりません')
    // seerCoIdはco_eventsのid → そこからseer_participant_idを取得
    const co = coEvents.find(c => c.id === Number(seerCoId))
    if (!co) return alert('COを選択してください')
    await seerResultsApi.add({
      game_id:              Number(gameId),
      seer_participant_id:  co.participant_id,
      target_participant_id: target.id,
      day_number:           Number(seerDay),
      result:               seerResult,
      disclosed_day:        seerDisclosedDay ? Number(seerDisclosedDay) : null,
    })
    setSeerTargetInput(''); setSeerDay(1); setSeerResult('white'); setSeerDisclosedDay('')
    load()
  }

  // ── 霊媒結果登録 ──
  const addMediumResult = async (e) => {
    e.preventDefault()
    const target = resolve(mediumTargetInput)
    if (!target) return alert('霊媒対象が見つかりません')
    const co = coEvents.find(c => c.id === Number(mediumCoId))
    if (!co) return alert('COを選択してください')
    await mediumResultsApi.add({
      game_id:               Number(gameId),
      medium_participant_id: co.participant_id,
      target_participant_id: target.id,
      day_number:            Number(mediumDay),
      result:                mediumResult,
      disclosed_day:         mediumDisclosedDay ? Number(mediumDisclosedDay) : null,
    })
    setMediumTargetInput(''); setMediumDay(1); setMediumResult('white'); setMediumDisclosedDay('')
    load()
  }

  // ── 騎士護衛登録 ──
  const addKnightGuard = async (e) => {
    e.preventDefault()
    const target = knightTargetInput.trim() ? resolve(knightTargetInput) : null
    const co = coEvents.find(c => c.id === Number(knightCoId))
    if (!co) return alert('COを選択してください')
    await knightGuardsApi.add({
      game_id:               Number(gameId),
      knight_participant_id: co.participant_id,
      target_participant_id: target ? target.id : null,  // null許容
      day_number:            Number(knightDay),
      is_gj:                 knightIsGj,
      disclosed_day:         knightDisclosedDay ? Number(knightDisclosedDay) : null,
    })
    setKnightTargetInput(''); setKnightDay(1); setKnightIsGj(false); setKnightDisclosedDay('')
    load()
  }

  // 偽COかどうかの判定（参加者の実際の役職 vs 主張役職）
  const isFake = (co) => {
    const p = participants.find(p => p.id === co.participant_id)
    return p && String(p.role_id) !== String(co.claimed_role_id)
  }

  // COを役職名でフィルタするヘルパー
  const cosByRole = (roleName) =>
    coEvents.filter(co => co.claimed_role_name === roleName)

  
  // 本物COを自動選択（seer/medium/knightそれぞれ）
  useEffect(() => {
    const realSeer = cosByRole('占い師').find(co => !isFake(co))
    if (realSeer) {
      setSeerCoId(String(realSeer.id))
      if (realSeer.co_day != null) {
        setSeerDisclosedDay(d => d || String(realSeer.co_day))
      }
    }
    const realMedium = cosByRole('霊媒師').find(co => !isFake(co))
    if (realMedium) {
      setMediumCoId(String(realMedium.id))
      if (realMedium.co_day != null) {
        setMediumDisclosedDay(d => d || String(realMedium.co_day))
      }
    }
    const realKnight = cosByRole('騎士').find(co => !isFake(co))
    if (realKnight) {
      setKnightCoId(String(realKnight.id))
    }
  }, [coEvents])

  return (
    <div>
      {/* ── COイベント登録 ── */}
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
              onChange={e => setCoDay(e.target.value)} style={{ width: 60 }} />
          </label>
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
                      <input type="number" min="1" value={editCoDay}
                        onChange={e => setEditCoDay(e.target.value)}
                        placeholder="未COは空欄" style={{ width: 80 }} />
                    ) : (co.co_day != null ? `${co.co_day}日目` : '未CO')}
                  </td>
                  <td>{isFake(co) ? '⚠️ 偽CO' : '本物'}</td>
                  <td style={{ display: 'flex', gap: 4 }}>
                    {editingCoId === co.id ? (
                      <>
                        <button onClick={async () => {
                          await coEventsApi.update(co.id, {
                            claimed_role_id: Number(editCoClaimedRole),
                            co_day: editCoDay ? Number(editCoDay) : null,
                          })
                          setEditingCoId(null)
                          load()
                        }}>保存</button>
                        <button className="secondary" onClick={() => setEditingCoId(null)}>
                          キャンセル
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="secondary" onClick={() => {
                          setEditingCoId(co.id)
                          setEditCoClaimedRole(co.claimed_role_id)
                          setEditCoDay(co.co_day != null ? String(co.co_day) : '')
                        }}>編集</button>
                        <button className="secondary" onClick={async () => {
                          await coEventsApi.del(co.id); load()
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

      {/* ── 占い師 ── */}
      <div className="card">
        <h2>占い師CO</h2>
        {cosByRole('占い師').length === 0
          ? <p style={{ color: '#888' }}>占い師COなし</p>
          : (
            <>
              <form onSubmit={addSeerResult} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <select value={seerCoId} onChange={e => {
  const newCoId = e.target.value
  setSeerCoId(newCoId)
  const co = coEvents.find(c => c.id === Number(newCoId))
  if (co) {
    setSeerDisclosedDay(String(Math.max(co.co_day, Number(seerDay) || 1)))
  }
}} required>
                  
                  {cosByRole('占い師').map(co => (
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
    setSeerDay(newDay)
    const co = coEvents.find(c => c.id === Number(seerCoId))
    if (co && newDay) {
      setSeerDisclosedDay(String(Math.max(co.co_day, Number(newDay))))
    }
  }} style={{ width: 55 }} />
                </label>
                <select value={seerResult} onChange={e => setSeerResult(e.target.value)}>
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
                          {r.result === 'black' ? '黒' : '白'}
                        </td>
                        <td>{r.disclosed_day ? `${r.disclosed_day}日目` : '未開示'}</td>
                        <td>
                          <button className="secondary" onClick={async () => {
                            await seerResultsApi.del(r.id); load()
                          }}>削除</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )
        }
      </div>

      {/* ── 霊媒師 ── */}
      <div className="card">
        <h2>霊媒師CO</h2>
        {cosByRole('霊媒師').length === 0
          ? <p style={{ color: '#888' }}>霊媒師COなし</p>
          : (
            <>
              <form onSubmit={addMediumResult} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <select value={mediumCoId} onChange={e => {
  const newCoId = e.target.value
  setMediumCoId(newCoId)
  const co = coEvents.find(c => c.id === Number(newCoId))
  if (co) {
    setMediumDisclosedDay(String(Math.max(co.co_day, Number(mediumDay) || 1)))
  }
}} required>
                  
                  {cosByRole('霊媒師').map(co => (
                    <option key={co.id} value={co.id}>
                      {co.player_name}（{co.co_day != null ? `${co.co_day}日目CO` : '未CO'}）{isFake(co) ? ' ⚠️偽' : ''}
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
    setMediumDay(newDay)
    const co = coEvents.find(c => c.id === Number(mediumCoId))
    if (co && newDay) {
      setMediumDisclosedDay(String(Math.max(co.co_day, Number(newDay))))
    }
  }} style={{ width: 55 }} />
                </label>
                <select value={mediumResult} onChange={e => setMediumResult(e.target.value)}>
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
                        <td>{r.medium_name}</td>
                        <td>{r.target_name}</td>
                        <td>{r.day_number}日目</td>
                        <td style={{ color: r.result === 'black' ? '#c00' : '#080', fontWeight: 'bold' }}>
                          {r.result === 'black' ? '黒' : '白'}
                        </td>
                        <td>{r.disclosed_day ? `${r.disclosed_day}日目` : '未開示'}</td>
                        <td>
                          <button className="secondary" onClick={async () => {
                            await mediumResultsApi.del(r.id); load()
                          }}>削除</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )
        }
      </div>

      {/* ── 騎士 ── */}
      <div className="card">
        <h2>騎士CO</h2>
        {cosByRole('騎士').length === 0
          ? <p style={{ color: '#888' }}>騎士COなし</p>
          : (
            <>
              <form onSubmit={addKnightGuard} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <select value={knightCoId} onChange={e => setKnightCoId(e.target.value)} required>
                 
                  {cosByRole('騎士').map(co => (
                    <option key={co.id} value={co.id}>
                      {co.player_name}（{co.co_day != null ? `${co.co_day}日目CO` : '未CO'}）{isFake(co) ? ' ⚠️偽' : ''}
                    </option>
                  ))}
                </select>
                <input value={knightTargetInput} onChange={e => setKnightTargetInput(e.target.value)}
                  placeholder="護衛対象（空欄＝不明）" style={{ width: 190 }} />
                <label>
                  護衛日：
                  <input type="number" min="1" value={knightDay}
                    onChange={e => setKnightDay(e.target.value)} style={{ width: 55 }} />
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

              {knightGuards.length > 0 && (
                <table style={{ marginTop: 12 }}>
                  <thead>
                    <tr><th>騎士</th><th>護衛対象</th><th>護衛日</th><th>GJ</th><th>開示日</th><th></th></tr>
                  </thead>
                  <tbody>
                    {knightGuards.map(g => (
                      <tr key={g.id} style={{ opacity: g.disclosed_day ? 1 : 0.6 }}>
                        <td>{g.knight_name}</td>
                        <td>{g.target_name ?? '不明'}</td>
                        <td>{g.day_number}日目</td>
                        <td>{g.is_gj ? '✅ GJ' : '―'}</td>
                        <td>{g.disclosed_day ? `${g.disclosed_day}日目` : '未開示'}</td>
                        <td>
                          <button className="secondary" onClick={async () => {
                            await knightGuardsApi.del(g.id); load()
                          }}>削除</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )
        }
      </div>
    </div>
  )
}

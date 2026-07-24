import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api'

export default function GameView() {
  const { id } = useParams()
  const [game,         setGame]         = useState(null)
  const [participants, setParticipants] = useState([])
  const [day,          setDay]          = useState(1)
  const [votes,        setVotes]        = useState([])
  const [executions,   setExecutions]   = useState([])
  const [nightKills,   setNightKills]   = useState([])

  useEffect(() => {
    api.get('/games').then(gs => setGame(gs.find(g => String(g.id) === String(id)) ?? null))
    api.get(`/participants/game/${id}`).then(setParticipants)
  }, [id])

  useEffect(() => {
    api.get(`/votes/game/${id}/day/${day}`).then(setVotes).catch(() => setVotes([]))
    api.get(`/executions/game/${id}`).then(setExecutions).catch(() => setExecutions([]))
    api.get(`/night-kills/game/${id}`).then(setNightKills).catch(() => setNightKills([]))
  }, [id, day])

  const getName = (pid) => participants.find(p => p.id === pid)?.player_name ?? `#${pid}`
  const getNum  = (pid) => participants.find(p => p.id === pid)?.participant_number ?? '?'
  const label   = (pid) => pid ? `${getNum(pid)}. ${getName(pid)}` : '—'

  const execLabel = (type) =>
    type === 'normal'           ? '通常吊り'
    : type === 'random'         ? 'ランダム吊り'
    : type === 'runoff_execution' ? '決戦釣り'
    : '吊りなし'

  const resultLabel = (r) =>
    r === 'village_win' ? '村勝利' : r === 'wolf_win' ? '人狼勝利' : r === 'other' ? 'その他' : '—'

  const dayExecs      = executions.filter(e => e.day_number === day)
  const dayNightKills = nightKills.filter(n => n.day_number === day)
  const sorted        = [...participants].sort((a, b) => (a.participant_number ?? 999) - (b.participant_number ?? 999))

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
        <h1 style={{ margin: 0 }}>試合 #{id} ログ</h1>
        <Link to={`/games/${id}`}>✏️ 入力モード</Link>
      </div>

      {/* 試合情報 */}
      {game && (
        <div className="card">
          <table>
            <tbody>
              <tr><th>日付</th><td>{game.played_at?.slice(0, 10) ?? '—'}</td></tr>
              <tr><th>結果</th><td>{resultLabel(game.result)}</td></tr>
              <tr><th>メモ</th><td>{game.notes ?? '—'}</td></tr>
            </tbody>
          </table>
        </div>
      )}

      {/* 参加者 */}
      <div className="card">
        <h2>参加者</h2>
        {sorted.length === 0 ? <p style={{ color: '#999' }}>記録なし</p> : (
          <table>
            <thead>
              <tr><th>番号</th><th>名前</th><th>役職</th><th>陣営</th><th>生存</th></tr>
            </thead>
            <tbody>
              {sorted.map(p => (
                <tr key={p.id}>
                  <td>{p.participant_number ?? '—'}</td>
                  <td>{p.player_name}</td>
                  <td>{p.role_name}</td>
                  <td><span className={`tag ${p.team}`}>{p.team}</span></td>
                  <td>{p.survived ? '✅' : '❌'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 日付選択 */}
      <div className="card">
        <h2>日付選択</h2>
        <form style={{ marginBottom: 0 }}>
          <label>何日目：</label>
          <input type="number" min="1" value={day}
            onChange={e => setDay(Number(e.target.value))} style={{ width: 80 }} />
        </form>
      </div>

      {/* 投票 */}
      <div className="card">
        <h2>{day}日目：投票</h2>
        {votes.length === 0 ? <p style={{ color: '#999' }}>記録なし</p> : (
          <table>
            <thead>
              <tr>
                <th>投票した人</th>
                <th>投票先</th>
                <th>種別</th>
                {day === 1 && <th>投票順</th>}
                <th>受けた順番</th>
              </tr>
            </thead>
            <tbody>
              {votes.map(v => (
                <tr key={v.id}>
                  <td>{label(v.voter_id)}</td>
                  <td>{label(v.target_id)}</td>
                  <td>{v.vote_type === 'normal' ? '通常' : '決選'}</td>
                  {day === 1 && <td>{v.vote_order ?? '—'}</td>}
                  <td>{v.receive_order ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 吊り */}
      <div className="card">
        <h2>{day}日目：吊り結果</h2>
        {dayExecs.length === 0 ? <p style={{ color: '#999' }}>記録なし</p> : (
          <table>
            <thead><tr><th>種別</th><th>吊られた人</th></tr></thead>
            <tbody>
              {dayExecs.map(e => (
                <tr key={e.id}>
                  <td>{execLabel(e.execution_type)}</td>
                  <td>{e.participant_id ? label(e.participant_id) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 噛み */}
      <div className="card">
        <h2>{day}日目：噛み結果</h2>
        {dayNightKills.length === 0 ? <p style={{ color: '#999' }}>記録なし</p> : (
          <table>
            <thead><tr><th>噛まれた人</th></tr></thead>
            <tbody>
              {dayNightKills.map(n => (
                <tr key={n.id}>
                  <td>{n.participant_id ? label(n.participant_id) : 'GJ'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

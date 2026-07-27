import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api'

// ── 投票マトリクス ────────────────────────────────────────────────
function VoteMatrix({ participants, votes, label, showVoteOrder }) {
  const sorted = [...participants].sort(
    (a, b) => (a.participant_number ?? 999) - (b.participant_number ?? 999)
  )

  const getNum = (id) =>
    participants.find(p => p.id === id)?.participant_number ?? '?'

  const getVotesReceived = (participantId) =>
    votes
      .filter(v => v.target_id === participantId)
      .sort((a, b) => {
        const ao = a.receive_order ?? 99999
        const bo = b.receive_order ?? 99999
        return ao !== bo ? ao - bo : (a.id ?? 0) - (b.id ?? 0)
      })

  const getVoteOrder = (participantId) =>
    votes.find(v => v.voter_id === participantId)?.vote_order ?? ''

  const maxReceived = Math.max(
    1,
    ...sorted.map(p => getVotesReceived(p.id).length)
  )

  const cell  = { border: '1px solid #bbb', width: 32, height: 26,
                  textAlign: 'center', fontSize: 12, padding: 0 }
  const label2 = { ...cell, fontWeight: 'bold',
                  borderTop: '2px solid #555', background: '#f5f5f5' }

  return (
    <div style={{ marginBottom: 20 }}>
      {label && (
        <div style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 4 }}>
          {label}
        </div>
      )}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse' }}>
          <tbody>
            {/* 上エリア：下詰めで受票者番号 */}
            {Array.from({ length: maxReceived }, (_, rowFromTop) => {
              const slotIndex = maxReceived - 1 - rowFromTop
              return (
                <tr key={`u${rowFromTop}`}>
                  {sorted.map(p => {
                    const received = getVotesReceived(p.id)
                    const vote = slotIndex < received.length
                      ? received[slotIndex] : null
                    return (
                      <td key={p.id} style={cell}>
                        {vote ? getNum(vote.voter_id) : ''}
                      </td>
                    )
                  })}
                </tr>
              )
            })}

            {/* ラベル行：参加者番号 */}
            <tr>
              {sorted.map(p => (
                <td key={p.id} style={label2}>
                  {p.participant_number ?? '?'}
                </td>
              ))}
            </tr>

            {/* 最下行：vote_order（2日目以降は自然と空欄） */}
            {showVoteOrder && (
  <tr>
    {sorted.map(p => (
      <td key={p.id} style={{ ...cell, color: '#666' }}>
        {getVoteOrder(p.id)}
      </td>
    ))}
  </tr>
)}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── メインページ ──────────────────────────────────────────────────
export default function GameView() {
  const { id } = useParams()
  const [game,          setGame]         = useState(null)
  const [participants,  setParticipants] = useState([])
  const [day,           setDay]          = useState(1)
  const [votes,         setVotes]        = useState([])
  const [executions,    setExecutions]   = useState([])
  const [nightKills,    setNightKills]   = useState([])
  const [showRoles,     setShowRoles]    = useState(false)
  const [coEvents,      setCoEvents]     = useState([])

   useEffect(() => {
    api.get('/games').then(gs =>
      setGame(gs.find(g => String(g.id) === String(id)) ?? null)
    )
    api.get(`/participants/game/${id}`).then(setParticipants)
    api.get(`/co-events/game/${id}`).then(setCoEvents).catch(() => setCoEvents([]))
  }, [id])

  useEffect(() => {
    api.get(`/votes/game/${id}/day/${day}`)
      .then(setVotes).catch(() => setVotes([]))
    api.get(`/executions/game/${id}`)
      .then(setExecutions).catch(() => setExecutions([]))
    api.get(`/night-kills/game/${id}`)
      .then(setNightKills).catch(() => setNightKills([]))
  }, [id, day])

  const getName = (pid) =>
    participants.find(p => p.id === pid)?.player_name ?? `#${pid}`
  const getNum  = (pid) =>
    participants.find(p => p.id === pid)?.participant_number ?? '?'
  const fmt = (pid) =>
    pid ? `${getNum(pid)}. ${getName(pid)}` : '—'

  const execLabel = (type) =>
    type === 'normal'             ? '通常吊り'
    : type === 'random'           ? 'ランダム吊り'
    : type === 'runoff_execution' ? '決戦釣り'
    : '吊りなし'

  const resultLabel = (r) =>
    r === 'village_win' ? '村勝利'
    : r === 'wolf_win'  ? '人狼勝利'
    : r === 'other'     ? 'その他' : '—'

      const sortedP      = [...participants].sort(
    (a, b) => (a.participant_number ?? 999) - (b.participant_number ?? 999)
  )

  // day日目時点でCO済みのイベントを取得（co_day <= day）
  const getCOs = (participantId) =>
    coEvents.filter(c => c.participant_id === participantId && c.co_day != null && c.co_day <= day)
    // day日目開始時点での死亡者ID（前日までの処刑・噛みが反映）
  const deadByDay = new Set([
    ...executions.filter(e => e.day_number < day && e.participant_id != null).map(e => e.participant_id),
    ...nightKills.filter(n => n.day_number < day && n.participant_id != null).map(n => n.participant_id),
  ])
  const normalVotes  = votes.filter(v => v.vote_type === 'normal')
  const runoffVotes  = votes.filter(v => v.vote_type === 'runoff')
  const dayExecs     = executions.filter(e => e.day_number === day)
  const dayKills     = nightKills.filter(n => n.day_number === day)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
        <h1 style={{ margin: 0 }}>試合 #{id} ログ</h1>
        <Link to={`/games/${id}`}>✏️ 入力モード</Link>
      </div>

      {/* 試合情報 */}
      {game && (
        <div className="card">
          <table><tbody>
            <tr><th>日付</th><td>{game.played_at?.slice(0, 10) ?? '—'}</td></tr>
            <tr><th>結果</th><td>{resultLabel(game.result)}</td></tr>
            <tr><th>メモ</th><td>{game.notes ?? '—'}</td></tr>
          </tbody></table>
        </div>
      )}

      {/* 参加者 */}
      <div className="card">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          参加者
          <button
            className="secondary"
            style={{ fontSize: 12, padding: '2px 10px' }}
            onClick={() => setShowRoles(v => !v)}
          >
            {showRoles ? '役職・陣営を隠す' : '役職・陣営を表示'}
          </button>
        </h2>
        {sortedP.length === 0 ? <p style={{ color: '#999' }}>記録なし</p> : (
          <table>
            <thead>
              <tr>
                <th>番号</th><th>名前</th>
                {showRoles && <><th>役職</th><th>陣営</th></>}
                <th>生存</th>
              </tr>
            </thead>
            <tbody>
              {sortedP.map(p => (
                <tr key={p.id}>
                  <td>{p.participant_number ?? '—'}</td>
                                    <td>
                    {p.player_name}
                    {getCOs(p.id).map(c => (
                      <span key={c.id} style={{
                        marginLeft: 6, fontSize: 11, padding: '1px 6px',
                        borderRadius: 10, background: '#dbeafe', color: '#1d4ed8',
                        fontWeight: 'bold', whiteSpace: 'nowrap',
                      }}>
                        CO:{c.claimed_role_name}
                      </span>
                    ))}
                  </td>
                  {showRoles && (
                    <>
                      <td>{p.role_name}</td>
                      <td><span className={`tag ${p.team}`}>{p.team}</span></td>
                    </>
                  )}
                  <td>{deadByDay.has(p.id) ? '❌' : '✅'}</td>
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
            onChange={e => setDay(Number(e.target.value))}
            style={{ width: 80 }} />
        </form>
      </div>

      {/* 投票マトリクス */}
      <div className="card">
        <h2>{day}日目：投票</h2>
        {votes.length === 0 ? <p style={{ color: '#999' }}>記録なし</p> : (
          <>
            <VoteMatrix
  participants={participants}
  votes={normalVotes}
  label={runoffVotes.length > 0 ? '通常投票' : null}
  showVoteOrder={day === 1}
/>
{runoffVotes.length > 0 && (
  <VoteMatrix
    participants={participants}
    votes={runoffVotes}
    label="決選投票"
    showVoteOrder={day === 1}
  />
)}
          </>
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
                  <td>{e.participant_id ? fmt(e.participant_id) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 噛み */}
      <div className="card">
        <h2>{day}日目：噛み結果</h2>
        {dayKills.length === 0 ? <p style={{ color: '#999' }}>記録なし</p> : (
          <table>
            <thead><tr><th>噛まれた人</th></tr></thead>
            <tbody>
              {dayKills.map(n => (
                <tr key={n.id}>
                  <td>{n.participant_id ? fmt(n.participant_id) : 'GJ'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

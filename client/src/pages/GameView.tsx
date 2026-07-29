import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api'
import type { Game, Participant, Vote, Execution, NightKill, CoEvent, SeerResult, MediumResult, KnightGuard } from '../types'
import CoStatusTable from './CoStatusTable'
import ExecutionKillTable from './ExecutionKillTable'


// ── 投票マトリクス ────────────────────────────────────────────────
type VoteMatrixProps = {
  participants: Participant[]
  votes:        Vote[]
  label:        string | null
  showVoteOrder: boolean
}
function VoteMatrix({ participants, votes, label, showVoteOrder }: VoteMatrixProps) {
  const sorted = [...participants].sort(
    (a, b) => (a.participant_number ?? 999) - (b.participant_number ?? 999)
  )

  const getNum = (id: number) =>
    participants.find(p => p.id === id)?.participant_number ?? '?'

  const getVotesReceived = (participantId: number) =>
    votes
      .filter(v => v.target_id === participantId)
      .sort((a, b) => {
        const ao = a.receive_order ?? 99999
        const bo = b.receive_order ?? 99999
        return ao !== bo ? ao - bo : (a.id ?? 0) - (b.id ?? 0)
      })

  const getVoteOrder = (participantId: number) =>
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
  const { id } = useParams<{ id: string }>()
const [game,          setGame]         = useState<Game | null>(null)
const [participants,  setParticipants] = useState<Participant[]>([])
const [day,           setDay]          = useState(1)
const [votes,         setVotes]        = useState<Vote[]>([])
const [executions,    setExecutions]   = useState<Execution[]>([])
const [nightKills,    setNightKills]   = useState<NightKill[]>([])
const [showRoles,     setShowRoles]    = useState(false)
const [showNames,     setShowNames]    = useState(true)
const [coEvents,      setCoEvents]     = useState<CoEvent[]>([])
const [seerResults,   setSeerResults]  = useState<SeerResult[]>([])
const [mediumResults, setMediumResults] = useState<MediumResult[]>([])
const [knightGuards,  setKnightGuards] = useState<KnightGuard[]>([])
const [coViewMode,    setCoViewMode]   = useState<'list' | 'table'>('list')
const [execKillViewMode, setExecKillViewMode] = useState<'list' | 'table'>('list')
  

   useEffect(() => {
    api.get('/games').then(gs =>
      setGame(gs.find(g => String(g.id) === String(id)) ?? null)
    )
    api.get(`/participants/game/${id}`).then(setParticipants)
    api.get(`/co-events/game/${id}`).then(setCoEvents).catch(() => setCoEvents([]))
    api.get(`/seer-results/game/${id}`).then(setSeerResults).catch(() => setSeerResults([]))
    api.get(`/medium-results/game/${id}`).then(setMediumResults).catch(() => setMediumResults([]))
    api.get(`/knight-guards/game/${id}`).then(setKnightGuards).catch(() => setKnightGuards([]))
  }, [id])

    useEffect(() => {
    api.get(`/executions/game/${id}`)
      .then(setExecutions).catch(() => setExecutions([]))
    api.get(`/night-kills/game/${id}`)
      .then(setNightKills).catch(() => setNightKills([]))
  }, [id])

  useEffect(() => {
    api.get(`/votes/game/${id}/day/${day}`)
      .then(setVotes).catch(() => setVotes([]))
  }, [id, day])

  const getName = (pid: number) =>
    participants.find(p => p.id === pid)?.player_name ?? `#${pid}`
  const getNum  = (pid: number) =>
    participants.find(p => p.id === pid)?.participant_number ?? '?'
  const fmt = (pid: number) =>
    pid ? `${getNum(pid)}. ${getName(pid)}` : '—'


  const isFake = (co: CoEvent) => {
   const p = participants.find(p => p.id === co.participant_id)
   return p != null && p.role_name !== co.claimed_role_name
 }

  const execLabel = (type: string) =>
    type === 'normal'             ? '通常吊り'
    : type === 'random'           ? 'ランダム吊り'
    : type === 'runoff_execution' ? '決戦釣り'
    : '吊りなし'

  const resultLabel = (r: string) =>
    r === 'village_win' ? '村勝利'
    : r === 'wolf_win'  ? '人狼勝利'
    : r === 'other'     ? 'その他' : '—'

      const sortedP      = [...participants].sort(
    (a, b) => (a.participant_number ?? 999) - (b.participant_number ?? 999)
  )

  // day日目時点でCO済みのイベントを取得（co_day <= day）
  const getCOs = (participantId: number) =>
    coEvents.filter(c => c.participant_id === participantId && c.co_day != null && c.co_day <= day)
    // day日目開始時点での死亡者ID（前日までの処刑・噛みが反映）
  const deadByDay = new Set([
    ...executions.filter(e => e.day_number < day && e.participant_id != null).map(e => e.participant_id),
    ...nightKills.filter(n => n.day_number < day && n.participant_id != null).map(n => n.participant_id),
  ])
  const normalVotes  = votes.filter(v => v.vote_type === 'normal')
  const runoffVotes  = votes.filter(v => v.vote_type === 'runoff')
  const runoff2Votes = votes.filter(v => v.vote_type === 'runoff2')
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
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          参加者
          <button
            className="secondary"
            style={{ fontSize: 12, padding: '2px 10px' }}
            onClick={() => setShowNames(v => !v)}
          >
            {showNames ? '名前を隠す' : '名前を表示'}
          </button>
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
                <th>番号</th>
                {showNames && <th>名前</th>}
                <th>CO</th>
                {showRoles && <><th>役職</th><th>陣営</th></>}
                <th>生存</th>
              </tr>
            </thead>
            <tbody>
              {sortedP.map(p => (
                <tr key={p.id}>
                  <td>{p.participant_number ?? '—'}</td>
                  {showNames && <td>{p.player_name}</td>}
                  <td>
                    {getCOs(p.id).map(c => (
                      <span key={c.id} style={{
                        marginRight: 4, fontSize: 11, padding: '1px 6px',
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

      {/* CO状況 */}
      {(() => {
        const cosByRole = (roleName) =>
          coEvents.filter(c => c.claimed_role_name === roleName && c.co_day != null && c.co_day <= day)
        const resultColor = (r) => r === 'black' ? '#c00' : '#080'
        const resultLabel2 = (r) => r === 'black' ? '黒' : '白'

        const seerCOs   = cosByRole('占い師')
        const mediumCOs = cosByRole('霊媒師')
        const knightCOs = cosByRole('騎士')
        if (!seerCOs.length && !mediumCOs.length && !knightCOs.length) return null

        return (
          <div className="card">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
             CO状況（{day}日目時点）
             <button
               className="secondary"
               style={{ fontSize: 12, padding: '2px 10px' }}
               onClick={() => setCoViewMode(m => m === 'list' ? 'table' : 'list')}
             >
               {coViewMode === 'list' ? '表で見る' : 'リストで見る'}
             </button>
          </h2>

           {coViewMode === 'table' && (
            <CoStatusTable
               participants={participants}
               coEvents={coEvents.filter(c => c.co_day != null && c.co_day <= day)}
               seerResults={seerResults.filter(r => r.disclosed_day != null && r.disclosed_day <= day)}
               mediumResults={mediumResults.filter(r => r.disclosed_day != null && r.disclosed_day <= day)}
               knightGuards={knightGuards.filter(g => g.disclosed_day != null && g.disclosed_day <= day)}
               isFake={isFake}
             />
           )}

           {coViewMode === 'list' && (

            <>
            {/* 占い師 */}
            {seerCOs.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, marginBottom: 6 }}>🔮 占い師CO</h3>
                {seerCOs.map(co => {
                  const results = seerResults.filter(
                    r => r.seer_participant_id === co.participant_id &&
                         r.disclosed_day != null && r.disclosed_day <= day
                  )
                  return (
                    <div key={co.id} style={{ marginBottom: 8 }}>
                                            <strong>
                        {showNames ? co.player_name : `${getNum(co.participant_id)}番`}
                      </strong>
                      {results.length === 0
                        ? <span style={{ color: '#999', marginLeft: 8, fontSize: 13 }}>開示なし</span>
                        : (
                          <table style={{ marginTop: 4 }}>
                            <thead>
                              <tr><th>対象</th><th>占い日</th><th>結果</th></tr>
                            </thead>
                            <tbody>
                              {results.map(r => (
                                <tr key={r.id}>
                                  <td>{showNames ? r.target_name : `${getNum(r.target_participant_id)}番`}</td>
                                  <td>{r.day_number}日目</td>
                                  <td style={{ color: resultColor(r.result), fontWeight: 'bold' }}>
                                    {resultLabel2(r.result)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )
                      }
                    </div>
                  )
                })}
              </div>
            )}

            {/* 霊媒師 */}
            {mediumCOs.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, marginBottom: 6 }}>👻 霊媒師CO</h3>
                {mediumCOs.map(co => {
                  const results = mediumResults.filter(
                    r => r.medium_participant_id === co.participant_id &&
                         r.disclosed_day != null && r.disclosed_day <= day
                  )
                  return (
                    <div key={co.id} style={{ marginBottom: 8 }}>
                                           <strong>
                        {showNames ? co.player_name : `${getNum(co.participant_id)}番`}
                      </strong>
                      {results.length === 0
                        ? <span style={{ color: '#999', marginLeft: 8, fontSize: 13 }}>開示なし</span>
                        : (
                          <table style={{ marginTop: 4 }}>
                            <thead>
                              <tr><th>対象</th><th>処刑日</th><th>結果</th></tr>
                            </thead>
                            <tbody>
                              {results.map(r => (
                                <tr key={r.id}>
                                  <td>{showNames ? r.target_name : `${getNum(r.target_participant_id)}番`}</td>
                                  <td>{r.day_number}日目</td>
                                  <td style={{ color: resultColor(r.result), fontWeight: 'bold' }}>
                                    {resultLabel2(r.result)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )
                      }
                    </div>
                  )
                })}
              </div>
            )}

            {/* 騎士 */}
            {knightCOs.length > 0 && (
              <div>
                <h3 style={{ fontSize: 14, marginBottom: 6 }}>🛡 騎士CO</h3>
                {knightCOs.map(co => {
                  const guards = knightGuards.filter(
                    g => g.knight_participant_id === co.participant_id &&
                         g.disclosed_day != null && g.disclosed_day <= day
                  )
                  return (
                    <div key={co.id} style={{ marginBottom: 8 }}>
                                            <strong>
                        {showNames ? co.player_name : `${getNum(co.participant_id)}番`}
                      </strong>
                      {guards.length === 0
                        ? <span style={{ color: '#999', marginLeft: 8, fontSize: 13 }}>開示なし</span>
                        : (
                          <table style={{ marginTop: 4 }}>
                            <thead>
                              <tr><th>護衛対象</th><th>護衛日</th><th>GJ</th></tr>
                            </thead>
                            <tbody>
                              {guards.map(g => (
                                <tr key={g.id}>
                                                                    <td>{showNames ? (g.target_name ?? '不明') : (g.target_participant_id ? `${getNum(g.target_participant_id)}番` : '不明')}</td>
                                  <td>{g.day_number}日目</td>
                                  <td>{g.is_gj ? '✅ GJ' : '―'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )
                      }
                    </div>
                  )
                })}
              </div>
            )}
            </>
            )}
          </div>
        )
      })()}
      
      {/* 投票マトリクス */}
      <div className="card">
        <h2>{day}日目：投票</h2>
        {votes.length === 0 ? <p style={{ color: '#999' }}>記録なし</p> : (
          <>
            <VoteMatrix
  participants={participants}
  votes={normalVotes}
  label={(runoffVotes.length > 0 || runoff2Votes.length > 0) ? '通常投票' : null}
  showVoteOrder={day === 1}
/>
{runoffVotes.length > 0 && (
  <VoteMatrix
    participants={participants}
    votes={runoffVotes}
    label="決選投票"
    showVoteOrder={false}
  />
)}
{runoff2Votes.length > 0 && (
  <VoteMatrix
    participants={participants}
    votes={runoff2Votes}
    label="2回目決選投票"
    showVoteOrder={false}
  />
)}
          </>
        )}
      </div>

      {/* 吊り・噛み・護衛 */}
      <div className="card">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          吊り・噛み・護衛
          <button
            className="secondary"
            style={{ fontSize: 12, padding: '2px 10px' }}
            onClick={() => setExecKillViewMode(m => m === 'list' ? 'table' : 'list')}
          >
            {execKillViewMode === 'list' ? '表で見る' : 'リストで見る'}
          </button>
        </h2>
 
        {execKillViewMode === 'table' && (
          <ExecutionKillTable
            participants={participants}
            executions={executions}
            nightKills={nightKills}
            knightGuards={knightGuards}
            coEvents={coEvents}
            mediumResults={mediumResults}
            maxDay={day}
          />
        )}
 
        {execKillViewMode === 'list' && (
          <>
            <h3 style={{ fontSize: 14, marginBottom: 6 }}>{day}日目：吊り結果</h3>
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
 
            <h3 style={{ fontSize: 14, margin: '16px 0 6px' }}>{day}日目：噛み結果</h3>
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
          </>
        )}
      </div>
    </div>
  )
}

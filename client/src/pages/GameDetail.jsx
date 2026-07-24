import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api'

export default function GameDetail() {
  const { id } = useParams()

  const [players,      setPlayers]      = useState([])
  const [roles,        setRoles]        = useState([])
  const [participants, setParticipants] = useState([])
  const [day,          setDay]          = useState(1)

  // 参加者追加フォーム
  const [pPlayerId, setPPlayerId] = useState('')
  const [pRoleId,   setPRoleId]   = useState('')
  const [pSurvived, setPSurvived] = useState(false)

  // 投票フォーム
  const [vVoterId,       setVVoterId]       = useState('')
  const [vTargetId,      setVTargetId]      = useState('')
  const [vType,          setVType]          = useState('normal')
  const [vVoteOrder,     setVVoteOrder]     = useState('')
  const [vReceiveOrder,  setVReceiveOrder]  = useState('')

  // 吊りフォーム
  const [eParticipantId, setEParticipantId] = useState('')
  const [eType,          setEType]          = useState('normal')

  // 噛みフォーム
  const [nParticipantId, setNParticipantId] = useState('')

  const loadParticipants = () =>
    api.get(`/participants/game/${id}`).then(setParticipants)

  useEffect(() => {
    api.get('/players').then(setPlayers)
    api.get('/roles').then(setRoles)
    loadParticipants()
  }, [id])

  // 参加者追加
  const addParticipant = async (e) => {
    e.preventDefault()
    await api.post('/participants', {
      game_id: Number(id),
      player_id: Number(pPlayerId),
      role_id: Number(pRoleId),
      survived: pSurvived,
    })
    setPPlayerId(''); setPRoleId(''); setPSurvived(false)
    loadParticipants()
  }

  // 投票追加
  const addVote = async (e) => {
    e.preventDefault()
    await api.post('/votes', {
      game_id: Number(id),
      day_number: day,
      vote_type: vType,
      voter_id: Number(vVoterId),
      target_id: Number(vTargetId),
      vote_order:    day === 1 && vVoteOrder    ? Number(vVoteOrder)    : null,
      receive_order: vReceiveOrder ? Number(vReceiveOrder) : null,
    })
    setVVoterId(''); setVTargetId(''); setVVoteOrder(''); setVReceiveOrder('')
  }

  // 吊り追加
  const addExecution = async (e) => {
    e.preventDefault()
    await api.post('/executions', {
      game_id: Number(id),
      day_number: day,
      participant_id: eType === 'none' ? null : Number(eParticipantId),
      execution_type: eType,
    })
    setEParticipantId(''); setEType('normal')
  }

  // 噛み追加
  const addNightKill = async (e) => {
    e.preventDefault()
    await api.post('/night-kills', {
      game_id: Number(id),
      day_number: day,
      participant_id: nParticipantId ? Number(nParticipantId) : null,
    })
    setNParticipantId('')
  }

  return (
    <div>
      <h1>試合 #{id} 記録</h1>

      {/* ── 参加者 ── */}
      <div className="card">
        <h2>参加者・役職</h2>
        <form onSubmit={addParticipant}>
          <select value={pPlayerId} onChange={e => setPPlayerId(e.target.value)} required>
            <option value="">プレイヤーを選択</option>
            {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={pRoleId} onChange={e => setPRoleId(e.target.value)} required>
            <option value="">役職を選択</option>
            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <label>
            <input type="checkbox" checked={pSurvived} onChange={e => setPSurvived(e.target.checked)} />
            　生存
          </label>
          <button type="submit">追加</button>
        </form>
        <table>
          <thead><tr><th>プレイヤー</th><th>役職</th><th>陣営</th><th>生存</th></tr></thead>
          <tbody>
            {participants.map(p => (
              <tr key={p.id}>
                <td>{p.player_name}</td>
                <td>{p.role_name}</td>
                <td><span className={`tag ${p.team}`}>{p.team}</span></td>
                <td>{p.survived ? '✅' : '❌'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── 日付選択 ── */}
      <div className="card">
        <h2>日付選択</h2>
        <form style={{ marginBottom: 0 }}>
          <label>何日目：</label>
          <input type="number" min="1" value={day} onChange={e => setDay(Number(e.target.value))} style={{ width: 80 }} />
        </form>
      </div>

      {/* ── 投票 ── */}
      <div className="card">
        <h2>{day}日目：投票</h2>
        <form onSubmit={addVote}>
          <select value={vVoterId} onChange={e => setVVoterId(e.target.value)} required>
            <option value="">投票した人</option>
            {participants.map(p => <option key={p.id} value={p.id}>{p.player_name}</option>)}
          </select>
          <select value={vTargetId} onChange={e => setVTargetId(e.target.value)} required>
            <option value="">投票先</option>
            {participants.map(p => <option key={p.id} value={p.id}>{p.player_name}</option>)}
          </select>
          <select value={vType} onChange={e => setVType(e.target.value)}>
            <option value="normal">通常投票</option>
            <option value="runoff">決選投票</option>
          </select>
          {day === 1 && (
            <input type="number" min="1" value={vVoteOrder} onChange={e => setVVoteOrder(e.target.value)}
              placeholder="投票順（初日のみ）" style={{ width: 150 }} />
          )}
          <input type="number" min="1" value={vReceiveOrder} onChange={e => setVReceiveOrder(e.target.value)}
            placeholder="受けた順番" style={{ width: 120 }} />
          <button type="submit">記録</button>
        </form>
      </div>

      {/* ── 吊り ── */}
      <div className="card">
        <h2>{day}日目：吊り結果</h2>
        <form onSubmit={addExecution}>
          <select value={eType} onChange={e => setEType(e.target.value)}>
            <option value="normal">通常吊り</option>
            <option value="random">ランダム吊り</option>
            <option value="none">吊りなし</option>
          </select>
          {eType !== 'none' && (
            <select value={eParticipantId} onChange={e => setEParticipantId(e.target.value)} required>
              <option value="">吊られた人</option>
              {participants.map(p => <option key={p.id} value={p.id}>{p.player_name}</option>)}
            </select>
          )}
          <button type="submit">記録</button>
        </form>
      </div>

      {/* ── 噛み ── */}
      <div className="card">
        <h2>{day}日目：噛み結果</h2>
        <form onSubmit={addNightKill}>
          <select value={nParticipantId} onChange={e => setNParticipantId(e.target.value)}>
            <option value="">噛まれた人（GJはそのまま記録）</option>
            {participants.map(p => <option key={p.id} value={p.id}>{p.player_name}</option>)}
          </select>
          <button type="submit">記録</button>
        </form>
      </div>
    </div>
  )
}

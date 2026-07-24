import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api'

export default function GameDetail() {
  const { id } = useParams()

  const [players,      setPlayers]      = useState([])
  const [roles,        setRoles]        = useState([])
  const [participants, setParticipants] = useState([])
  const [day,          setDay]          = useState(1)

  const [pPlayerText,  setPPlayerText]  = useState('')
  const [pFiltered,    setPFiltered]    = useState([])
  const [pShowList,    setPShowList]    = useState(false)

  const [editingId, setEditingId] = useState(null)
  const [editRoleId, setEditRoleId] = useState('')
  const [editSurvived, setEditSurvived] = useState(false)
  
  // 参加者追加フォーム
  const [pPlayerId, setPPlayerId] = useState('')
  const [pRoleId,   setPRoleId]   = useState('')
  const [pSurvived, setPSurvived] = useState(false)
  const [pNumber,   setPNumber]   = useState('')

  // 投票フォーム
  const [vVoterInput,    setVVoterInput]    = useState('')
  const [vTargetInput,   setVTargetInput]   = useState('')
  const [vType,          setVType]          = useState('normal')
  const [vVoteOrder,     setVVoteOrder]     = useState('')
  const [vReceiveOrder,  setVReceiveOrder]  = useState('')
  const [votes,          setVotes]          = useState([])
  const [executions,     setExecutions]     = useState([])
  const [nightKills,     setNightKills]     = useState([])

  // 吊りフォーム
  const [eParticipantId, setEParticipantId] = useState('')
  const [eType,          setEType]          = useState('normal')

  // 噛みフォーム
  const [nParticipantId, setNParticipantId] = useState('')

    const loadParticipants = () =>
    api.get(`/participants/game/${id}`).then(setParticipants)

    const loadVotes = () =>
  api.get(`/votes/game/${id}/day/${day}`)
    .then(data => {
      console.log('votes取得結果:', data)
      setVotes(data)
    })
    .catch(err => console.error('votesエラー:', err))

  const loadExecutions = () =>
    api.get(`/executions/game/${id}`).then(setExecutions)

  const loadNightKills = () =>
    api.get(`/night-kills/game/${id}`).then(setNightKills)

  useEffect(() => {
    api.get('/players').then(setPlayers)
    api.get('/roles').then(setRoles)
    loadParticipants()
  }, [id])

  useEffect(() => {
    loadVotes()
    loadExecutions()
    loadNightKills()
  }, [id, day])

  // 番号または名前 → 参加者を検索するヘルパー
  const resolveParticipant = (input) => {
    const trimmed = input.trim()
    if (!trimmed) return null
    const num = parseInt(trimmed, 10)
    if (!isNaN(num) && String(num) === trimmed) {
      return participants.find(p => p.participant_number === num) ?? null
    }
    return participants.find(p => p.player_name === trimmed) ?? null
  }

  // 参加者追加
  const addParticipant = async (e) => {
  e.preventDefault()
  if (!pPlayerText.trim()) return

  // 完全一致を探す
  let playerId = pPlayerId
  if (!playerId) {
    const exact = players.find(p => p.name === pPlayerText.trim())
    if (exact) {
      playerId = exact.id
    } else {
      // 新規登録（同名なら既存を返す）
      const newPlayer = await api.post('/players', { name: pPlayerText.trim() })
      playerId = newPlayer.id
      await api.get('/players').then(setPlayers)
    }
  }

  await api.post('/participants', {
    game_id: Number(id),
    player_id: Number(playerId),
    role_id: Number(pRoleId),
    survived: pSurvived,
    participant_number: pNumber ? Number(pNumber) : null,
  })
  setPPlayerText(''); setPPlayerId(''); setPRoleId(''); setPSurvived(false); setPNumber('')
  loadParticipants()
}

  // 投票追加
  const addVote = async (e) => {
    e.preventDefault()
    const voter = resolveParticipant(vVoterInput)
    const target = resolveParticipant(vTargetInput)
    if (!voter || !target) {
      alert('投票した人・投票先が見つかりません（番号か名前で入力してください）')
      return
    }
    await api.post('/votes', {
      game_id: Number(id),
      day_number: day,
      vote_type: vType,
      voter_id: Number(vVoterId),
      target_id: Number(vTargetId),
      vote_order:    day === 1 && vVoteOrder    ? Number(vVoteOrder)    : null,
      receive_order: vReceiveOrder ? Number(vReceiveOrder) : null,
    })
    setVVoterInput(''); setVTargetInput(''); setVVoteOrder(''); setVReceiveOrder('')
    loadVotes()
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
    loadExecutions()
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
    loadNightKills()
  }

  return (
    <div>
      <h1>試合 #{id} 記録</h1>

      {/* ── 参加者 ── */}
<div className="card">
  <h2>参加者・役職</h2>
  <form onSubmit={addParticipant}>
    <div style={{ position: 'relative' }}>
      <input
        value={pPlayerText}
        onChange={e => {
          const val = e.target.value
          setPPlayerText(val)
          setPPlayerId('')
          if (val.trim()) {
            const filtered = players.filter(p =>
              p.name.includes(val)
            )
            setPFiltered(filtered)
            setPShowList(true)
          } else {
            setPShowList(false)
          }
        }}
        onBlur={() => setTimeout(() => setPShowList(false), 150)}
        placeholder="プレイヤー名を入力"
        required
      />
      {pShowList && pFiltered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, background: '#fff',
          border: '1px solid #ccc', borderRadius: 4, zIndex: 10, minWidth: 180
        }}>
          {pFiltered.map(p => (
            <div
              key={p.id}
              style={{ padding: '6px 12px', cursor: 'pointer' }}
              onMouseDown={() => {
                setPPlayerId(p.id)
                setPPlayerText(p.name)
                setPShowList(false)
              }}
            >
              {p.name}
            </div>
          ))}
        </div>
      )}
    </div>
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
    <thead><tr><th>プレイヤー</th><th>役職</th><th>陣営</th><th>生存</th><th></th></tr></thead>
    <tbody>
  {participants.map(p => (
    <tr key={p.id}>
      <td>{p.player_name}</td>
      <td>
        {editingId === p.id ? (
          <select value={editRoleId} onChange={e => setEditRoleId(e.target.value)}>
            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        ) : p.role_name}
      </td>
      <td>
        {editingId === p.id ? null : <span className={`tag ${p.team}`}>{p.team}</span>}
      </td>
      <td>
        {editingId === p.id ? (
          <input type="checkbox" checked={editSurvived}
            onChange={e => setEditSurvived(e.target.checked)} />
        ) : (p.survived ? '✅' : '❌')}
      </td>
      <td style={{ display: 'flex', gap: 4 }}>
        {editingId === p.id ? (
          <>
            <button onClick={async () => {
              await api.put(`/participants/${p.id}`, {
                role_id: Number(editRoleId),
                survived: editSurvived,
              })
              setEditingId(null)
              loadParticipants()
            }}>保存</button>
            <button className="secondary" onClick={() => setEditingId(null)}>
              キャンセル
            </button>
          </>
        ) : (
          <>
            <button className="secondary" onClick={() => {
              setEditingId(p.id)
              setEditRoleId(p.role_id)
              setEditSurvived(p.survived)
            }}>編集</button>
            <button className="secondary" onClick={async () => {
              await api.del(`/participants/${p.id}`)
              loadParticipants()
            }}>削除</button>
          </>
        )}
      </td>
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
          {day === 1 ? (
            <>
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
              <input type="number" min="1" value={vVoteOrder} onChange={e => setVVoteOrder(e.target.value)}
                placeholder="投票順（初日のみ）" style={{ width: 150 }} />
              <input type="number" min="1" value={vReceiveOrder} onChange={e => setVReceiveOrder(e.target.value)}
                placeholder="受けた順番" style={{ width: 120 }} />
            </>
          ) : (
            <>
              <select value={vTargetId} onChange={e => setVTargetId(e.target.value)} required>
                <option value="">投票先</option>
                {participants.map(p => <option key={p.id} value={p.id}>{p.player_name}</option>)}
              </select>
              <input type="number" min="1" value={vReceiveOrder} onChange={e => setVReceiveOrder(e.target.value)}
                placeholder="受けた順番" style={{ width: 120 }} />
              <select value={vType} onChange={e => setVType(e.target.value)}>
                <option value="normal">通常投票</option>
                <option value="runoff">決選投票</option>
              </select>
              <select value={vVoterId} onChange={e => setVVoterId(e.target.value)} required>
                <option value="">投票した人</option>
                {participants.map(p => <option key={p.id} value={p.id}>{p.player_name}</option>)}
              </select>
            </>
          )}
                    <button type="submit">記録</button>
        </form>

        {votes.length > 0 && (
          <table style={{ marginTop: 12 }}>
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
                  <td>{participants.find(p => p.id === v.voter_id)?.player_name ?? v.voter_id}</td>
                  <td>{participants.find(p => p.id === v.target_id)?.player_name ?? v.target_id}</td>
                  <td>{v.vote_type === 'normal' ? '通常' : '決選'}</td>
                  {day === 1 && <td>{v.vote_order ?? '―'}</td>}
                  <td>{v.receive_order ?? '―'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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

        {executions.filter(e => e.day_number === day).length > 0 && (
          <table style={{ marginTop: 12 }}>
            <thead>
              <tr><th>種別</th><th>吊られた人</th></tr>
            </thead>
            <tbody>
              {executions.filter(e => e.day_number === day).map(e => (
                <tr key={e.id}>
                  <td>{e.execution_type === 'normal' ? '通常吊り' : e.execution_type === 'random' ? 'ランダム吊り' : '吊りなし'}</td>
                  <td>{participants.find(p => String(p.id) === String(e.participant_id))?.player_name ?? '―'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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

        {nightKills.filter(n => n.day_number === day).length > 0 && (
          <table style={{ marginTop: 12 }}>
            <thead>
              <tr><th>噛まれた人</th></tr>
            </thead>
            <tbody>
              {nightKills.filter(n => n.day_number === day).map(n => (
                <tr key={n.id}>
                  <td>{participants.find(p => String(p.id) === String(n.participant_id))?.player_name ?? 'GJ'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

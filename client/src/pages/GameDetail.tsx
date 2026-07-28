import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api'
import COSection from './COSection'
import VoteMatrixInput from './VoteMatrixInput'


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
  
  const [editNumber, setEditNumber] = useState('')
  
  // 参加者追加フォーム
  const [pPlayerId, setPPlayerId] = useState('')
  const [pRoleId,   setPRoleId]   = useState('')
  
  const [pNumber,   setPNumber]   = useState('')

  // 投票フォーム
  const [vVoterInput,    setVVoterInput]    = useState('')
  const [vTargetInput,   setVTargetInput]   = useState('')
  const [vType,          setVType]          = useState('normal')
  const [vVoteOrder,     setVVoteOrder]     = useState('')
  const [vReceiveOrder,  setVReceiveOrder]  = useState('')
  const [votes,          setVotes]          = useState([])

  // ── 表入力モード ──
  const [voteInputMode, setVoteInputMode] = useState('form')   // 'form' | 'table'
  const [matrixInput,   setMatrixInput]   = useState({})       // { targetId: string[] }
  const [matrixType,    setMatrixType]    = useState('normal')
  const [executions,     setExecutions]     = useState([])
  const [nightKills,     setNightKills]     = useState([])

  // 吊りフォーム
  const [eParticipantId, setEParticipantId] = useState('')
  const [eType,          setEType]          = useState('normal')

  // 噛みフォーム
  const [nParticipantId, setNParticipantId] = useState('')
  const [nIsGj,          setNIsGj]          = useState(false)

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

  useEffect(() => {
  const nums = participants
    .map(p => p.participant_number)
    .filter(n => n != null)
  const next = nums.length === 0 ? 1 : Math.max(...nums) + 1
  setPNumber(String(next))
}, [participants])

  // votes が更新されたら matrixInput に反映（表モード時）
useEffect(() => {
  if (voteInputMode !== 'table') return
  const matrix = {}
  const filtered = votes.filter(v => v.vote_type === matrixType)
  for (const v of filtered) {
    const voterNum = participants.find(p => p.id === v.voter_id)?.participant_number
    if (voterNum == null) continue
    if (!matrix[v.target_id]) matrix[v.target_id] = []
    matrix[v.target_id].push(String(voterNum))
  }
  setMatrixInput(matrix)
}, [votes, matrixType, voteInputMode])

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

  const isAlive = (pid) =>
  !executions.some(e => e.participant_id === pid && e.day_number < day) &&
  !nightKills.some(n => n.participant_id === pid && n.day_number < day)

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
  participant_number: pNumber ? Number(pNumber) : null,
})
setPPlayerText(''); setPPlayerId(''); setPRoleId(''); setPNumber('')
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
      voter_id: voter.id,
      target_id: target.id,
      vote_order:    day === 1 && vVoteOrder    ? Number(vVoteOrder)    : null,
      receive_order: day !== 1 && vReceiveOrder ? Number(vReceiveOrder) : null,
    })
    setVVoterInput(''); setVTargetInput(''); setVVoteOrder(''); setVReceiveOrder('')
    loadVotes()
  }

    // 表モードで一括投票登録
  const submitMatrix = async () => {
  const toSubmit = []
  for (const [targetIdStr, voterNums] of Object.entries(matrixInput)) {
    for (const voterNumStr of (voterNums ?? [])) {
      if (!voterNumStr.trim()) continue
      const voter = resolveParticipant(voterNumStr.trim())
      if (!voter) { alert(`「${voterNumStr}」が見つかりません`); return }
      // 既に登録済みの投票はスキップ
      const alreadyExists = votes.some(
        v => v.voter_id === voter.id &&
             v.target_id === Number(targetIdStr) &&
             v.vote_type === matrixType
      )
      if (alreadyExists) continue
      toSubmit.push({
        game_id:       Number(id),
        day_number:    day,
        vote_type:     matrixType,
        voter_id:      voter.id,
        target_id:     Number(targetIdStr),
        vote_order:    null,
        receive_order: null,
      })
    }
  }
  if (!toSubmit.length) { loadVotes(); return }
  for (const v of toSubmit) await api.post('/votes', v)
  loadVotes()
}

  

  // 吊り追加
  const addExecution = async (e) => {
    e.preventDefault()
    const target = eType === 'none' ? null : resolveParticipant(eParticipantId)
    if (eType !== 'none' && !target) {
      alert('吊られた人が見つかりません（番号か名前で入力してください）')
      return
    }
    await api.post('/executions', {
      game_id: Number(id),
      day_number: day,
      participant_id: target ? target.id : null,
      execution_type: eType,
    })
    setEParticipantId(''); setEType('normal')
    loadExecutions()
  }


  // 噛み追加
    // 噛み追加
  const addNightKill = async (e) => {
    e.preventDefault()
    const target = (!nIsGj && nParticipantId.trim()) ? resolveParticipant(nParticipantId) : null
    await api.post('/night-kills', {
      game_id: Number(id),
      day_number: day,
      participant_id: target ? target.id : null,
    })

    if (nIsGj) {
      // 本物の騎士を特定（role_name が '騎士' の参加者）
      const knight = participants.find(p => p.role_name === '騎士')
      if (knight) {
        // 騎士護衛記録（is_gj = true）を自動追加
        await api.post('/knight-guards', {
          game_id:               Number(id),
          knight_participant_id: knight.id,
          target_participant_id: null,
          day_number:            day,
          is_gj:                 true,
          disclosed_day:         null,
        })
        // 騎士の co_day を GJ日+1 に自動更新
        const coEvents = await api.get(`/co-events/game/${id}`)
        const knightCo = coEvents.find(c => c.participant_id === knight.id)
        if (knightCo) {
          await api.put(`/co-events/${knightCo.id}`, {
            claimed_role_id: knightCo.claimed_role_id,
            co_day:          day + 1,
          })
        }
      }
    }

    setNParticipantId('')
    setNIsGj(false)
    loadNightKills()
  }
const [activeTab, setActiveTab] = useState('log')
  return (
    <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
        <h1 style={{ margin: 0 }}>試合 #{id} 記録</h1>
        <Link to={`/games/${id}/view`}>👁 確認モード</Link>
      </div>
{/* ── タブ切替 ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => setActiveTab('log')}
          style={{ fontWeight: activeTab === 'log' ? 'bold' : 'normal' }}
        >
          投票・吊り・噛み
        </button>
        <button
          onClick={() => setActiveTab('co')}
          style={{ fontWeight: activeTab === 'co' ? 'bold' : 'normal' }}
        >
          CO状況
        </button>
      </div>
      {/* ── ログタブ ── */}
      {activeTab === 'log' && (
  <>
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
        <input
      type="number" min="1"
      value={pNumber}
      onChange={e => setPNumber(e.target.value)}
      placeholder="番号"
      style={{ width: 70 }}
    />
    <button type="submit">追加</button>
  </form>
  <table>
        <thead><tr><th>番号</th><th>プレイヤー</th><th>役職</th><th>陣営</th><th>生存</th><th></th></tr></thead>
    <tbody>
  {participants.map(p => (
        <tr key={p.id}>
            <td>
        {editingId === p.id ? (
          <input type="number" min="1" value={editNumber}
            onChange={e => setEditNumber(e.target.value)}
            style={{ width: 60 }} />
        ) : (p.participant_number ?? '―')}
      </td>
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
      <td>{isAlive(p.id) ? '✅' : '❌'}</td>
      <td style={{ display: 'flex', gap: 4 }}>
        {editingId === p.id ? (
          <>
                       <button onClick={async () => {
              await api.put(`/participants/${p.id}`, {
  role_id: Number(editRoleId),
  participant_number: editNumber ? Number(editNumber) : null,
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
              setEditNumber(p.participant_number ?? '')
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
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {day}日目：投票
          <button type="button" className="secondary"
            style={{ fontSize: 12, padding: '2px 10px' }}
            onClick={() => { setVoteInputMode(m => m === 'form' ? 'table' : 'form'); setMatrixInput({}) }}>
            {voteInputMode === 'form' ? '表入力に切替' : 'フォーム入力に切替'}
          </button>
        </h2>

        {voteInputMode === 'form' ? (
          /* ── フォーム入力 ── */
          <form onSubmit={addVote}>
            {day === 1 ? (
              <>
                <input value={vVoterInput} onChange={e => setVVoterInput(e.target.value)}
                  placeholder="投票した人（番号or名前）" style={{ width: 180 }} required />
                <input value={vTargetInput} onChange={e => setVTargetInput(e.target.value)}
                  placeholder="投票先（番号or名前）" style={{ width: 170 }} required />
                <select value={vType} onChange={e => setVType(e.target.value)}>
                  <option value="normal">通常投票</option>
                  <option value="runoff">決選投票</option>
                </select>
                <input type="number" min="1" value={vVoteOrder} onChange={e => setVVoteOrder(e.target.value)}
                  placeholder="投票順（初日のみ）" style={{ width: 150 }} />
              </>
            ) : (
              <>
                <input value={vTargetInput} onChange={e => setVTargetInput(e.target.value)}
                  placeholder="投票先（番号or名前）" style={{ width: 170 }} required />
                <input type="number" min="1" value={vReceiveOrder} onChange={e => setVReceiveOrder(e.target.value)}
                  placeholder="受けた順番" style={{ width: 120 }} />
                <select value={vType} onChange={e => setVType(e.target.value)}>
                  <option value="normal">通常投票</option>
                  <option value="runoff">決選投票</option>
                </select>
                <input value={vVoterInput} onChange={e => setVVoterInput(e.target.value)}
                  placeholder="投票した人（番号or名前）" style={{ width: 180 }} required />
              </>
            )}
            <button type="submit">記録</button>
          </form>
                ) : (
          /* ── 表入力 ── */
          <VoteMatrixInput
  participants={participants}
  matrixInput={matrixInput}
  setMatrixInput={setMatrixInput}
  matrixType={matrixType}
  setMatrixType={setMatrixType}
  onSubmit={submitMatrix}
  votes={votes}
  day={day}
/>
        )}

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
            <option value="runoff_execution">決戦釣り</option>
            <option value="none">吊りなし</option>
          </select>
                    {eType !== 'none' && (
            <input value={eParticipantId} onChange={e => setEParticipantId(e.target.value)}
              placeholder="吊られた人（番号or名前）" style={{ width: 200 }} required />
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
                  <td>
  {e.execution_type === 'normal' ? '通常吊り'
    : e.execution_type === 'random' ? 'ランダム吊り'
    : e.execution_type === 'runoff_execution' ? '決戦釣り'
    : '吊りなし'}
</td>
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
                <form onSubmit={addNightKill} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input value={nIsGj ? '' : nParticipantId}
            onChange={e => setNParticipantId(e.target.value)}
            placeholder={nIsGj ? '（GJ）' : '噛まれた人（番号or名前）'}
            disabled={nIsGj}
            style={{ width: 220 }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
            <input type="checkbox" checked={nIsGj}
              onChange={e => { setNIsGj(e.target.checked); setNParticipantId('') }} />
            GJ
          </label>
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
    </>
        )}
{/* ── COタブ ── */}
    {activeTab === 'co' && (
      <COSection
        gameId={id}
        participants={participants}
        roles={roles}
      />
    )}
      
    </div>
  )
}

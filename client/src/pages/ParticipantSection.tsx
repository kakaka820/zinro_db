

Participantsection · TSX
import { useState, useEffect } from 'react'
import { api } from '../api'
import type { Player, Role, Participant, Execution, NightKill } from '../types'
 
type Props = {
  gameId: string
  players: Player[]
  roles: Role[]
  participants: Participant[]
  executions: Execution[]
  nightKills: NightKill[]
  day: number
  onRefresh: () => void
  onPlayersRefresh: () => void
}
 
export default function ParticipantSection({
  gameId, players, roles, participants, executions, nightKills, day,
  onRefresh, onPlayersRefresh,
}: Props) {
  const [pPlayerText, setPPlayerText] = useState('')
  const [pFiltered,   setPFiltered]   = useState<Player[]>([])
  const [pShowList,   setPShowList]   = useState(false)
  const [pPlayerId,   setPPlayerId]   = useState('')
  const [pRoleId,     setPRoleId]     = useState('')
  const [pNumber,     setPNumber]     = useState('')
 
  const [editingId,  setEditingId]  = useState<number | null>(null)
  const [editRoleId, setEditRoleId] = useState('')
  const [editNumber, setEditNumber] = useState('')
 
  // 役職一括設定用
  const [bulkDefaultRoleId, setBulkDefaultRoleId] = useState('')
  const [bulkInputs,        setBulkInputs]        = useState<Record<number, string>>({})
 
  useEffect(() => {
    const nums = participants
      .map(p => p.participant_number)
      .filter((n): n is number => n != null)
    setPNumber(String(nums.length === 0 ? 1 : Math.max(...nums) + 1))
  }, [participants])
 
  const isAlive = (pid: number) =>
    !executions.some(e => e.participant_id === pid && e.day_number < day) &&
    !nightKills.some(n => n.participant_id === pid && n.day_number < day)
 
  const addParticipant = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pPlayerText.trim()) return
    // 役職未選択の場合は「デフォルト役職」にフォールバック（先に一括設定パネルで選んでおく想定）
    const roleIdToUse = pRoleId || bulkDefaultRoleId
    if (!roleIdToUse) {
      alert('役職を選択するか、下の「デフォルト役職」を先に選んでおいてください')
      return
    }
    let playerId = pPlayerId
    if (!playerId) {
      const exact = players.find(p => p.name === pPlayerText.trim())
      if (exact) {
        playerId = String(exact.id)
      } else {
        const newPlayer = await api.post<Player>('/players', { name: pPlayerText.trim() })
        playerId = String(newPlayer.id)
        onPlayersRefresh()
      }
    }
    await api.post('/participants', {
      game_id:            Number(gameId),
      player_id:          Number(playerId),
      role_id:            Number(roleIdToUse),
      participant_number: pNumber ? Number(pNumber) : null,
    })
    setPPlayerText(''); setPPlayerId(''); setPRoleId(''); setPNumber('')
    onRefresh()
  }
 
  // "3,7,12" のような入力を番号の配列にパース（全角カンマ・スペース区切りにも対応）
  const parseNumbers = (text: string): number[] =>
    text.split(/[,、\s]+/)
      .map(s => s.trim())
      .filter(Boolean)
      .map(Number)
      .filter(n => !isNaN(n))
 
  // 役職ごとの番号入力から「参加者番号 → role_id」のマップを作り、まとめて更新する
  const applyBulkRoles = async () => {
    const numberToRoleId = new Map<number, number>()
    const duplicates = new Set<number>()
 
    for (const role of roles) {
      for (const num of parseNumbers(bulkInputs[role.id] ?? '')) {
        if (numberToRoleId.has(num)) duplicates.add(num)
        numberToRoleId.set(num, role.id)
      }
    }
    if (duplicates.size > 0) {
      alert(`番号 ${[...duplicates].join(', ')} が複数の役職に重複して指定されています`)
      return
    }
 
    const numbered = participants.filter(
      (p): p is Participant & { participant_number: number } => p.participant_number != null
    )
    const missing = [...numberToRoleId.keys()].filter(
      num => !numbered.some(p => p.participant_number === num)
    )
    if (missing.length > 0) {
      alert(`番号 ${missing.join(', ')} の参加者がまだ登録されていません。先に名前・番号を登録してください`)
      return
    }
 
    const defaultRoleId = bulkDefaultRoleId ? Number(bulkDefaultRoleId) : null
    const updates = numbered
      .map(p => ({
        p,
        targetRoleId: numberToRoleId.get(p.participant_number) ?? defaultRoleId,
      }))
      .filter((u): u is { p: typeof numbered[number]; targetRoleId: number } =>
        u.targetRoleId != null && u.targetRoleId !== u.p.role_id
      )
 
    for (const { p, targetRoleId } of updates) {
      await api.put(`/participants/${p.id}`, {
        role_id: targetRoleId,
        participant_number: p.participant_number,
      })
    }
    onRefresh()
  }
 
  const saveEdit = async (p: Participant) => {
    await api.put(`/participants/${p.id}`, {
      role_id:            Number(editRoleId),
      participant_number: editNumber ? Number(editNumber) : null,
    })
    setEditingId(null)
    onRefresh()
  }
 
  return (
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
                setPFiltered(players.filter(p => p.name.includes(val)))
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
              position: 'absolute', top: '100%', left: 0,
              background: '#fff', border: '1px solid #ccc',
              borderRadius: 4, zIndex: 10, minWidth: 180,
            }}>
              {pFiltered.map(p => (
                <div
                  key={p.id}
                  style={{ padding: '6px 12px', cursor: 'pointer' }}
                  onMouseDown={() => {
                    setPPlayerId(String(p.id))
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
        <select value={pRoleId} onChange={e => setPRoleId(e.target.value)}>
          <option value="">
            {bulkDefaultRoleId
              ? `役職を選択（未選択なら「${roles.find(r => String(r.id) === bulkDefaultRoleId)?.name}」）`
              : '役職を選択'}
          </option>
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
 
      <div className="card" style={{ background: '#fafafa', marginTop: 12 }}>
        <h3 style={{ fontSize: 15, marginBottom: 4 }}>役職を番号で一括設定</h3>
        <p style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
          各役職の欄に、その役職を持つ参加者番号をカンマ区切りで入力してください（例: 3,7,12）。
          指定されなかった番号は下のデフォルト役職になります。
        </p>
 
        <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12, marginBottom: 10, maxWidth: 240 }}>
          デフォルト役職（指定なしの番号 / 名前登録時の初期値）
          <select value={bulkDefaultRoleId} onChange={e => setBulkDefaultRoleId(e.target.value)}>
            <option value="">（未設定）</option>
            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </label>
 
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 8, marginBottom: 10,
        }}>
          {roles
            .filter(r => String(r.id) !== bulkDefaultRoleId)
            .map(r => (
              <label key={r.id} style={{ display: 'flex', flexDirection: 'column', fontSize: 12 }}>
                {r.name}
                <input
                  value={bulkInputs[r.id] ?? ''}
                  onChange={e => setBulkInputs(prev => ({ ...prev, [r.id]: e.target.value }))}
                  placeholder="例: 3,7,12"
                />
              </label>
            ))}
        </div>
 
        <button type="button" onClick={applyBulkRoles}>一括適用</button>
      </div>
 
      <table>
        <thead>
          <tr>
            <th>番号</th><th>プレイヤー</th><th>役職</th><th>陣営</th><th>生存</th><th></th>
          </tr>
        </thead>
        <tbody>
          {participants.map(p => (
            <tr key={p.id}>
              <td>
                {editingId === p.id ? (
                  <input
                    type="number" min="1" value={editNumber}
                    onChange={e => setEditNumber(e.target.value)}
                    style={{ width: 60 }}
                  />
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
                {editingId !== p.id && (
                  <span className={`tag ${p.team}`}>{p.team}</span>
                )}
              </td>
              <td>{isAlive(p.id) ? '✅' : '❌'}</td>
              <td style={{ display: 'flex', gap: 4 }}>
                {editingId === p.id ? (
                  <>
                    <button onClick={() => saveEdit(p)}>保存</button>
                    <button className="secondary" onClick={() => setEditingId(null)}>
                      キャンセル
                    </button>
                  </>
                ) : (
                  <>
                    <button className="secondary" onClick={() => {
                      setEditingId(p.id)
                      setEditRoleId(String(p.role_id))
                      setEditNumber(String(p.participant_number ?? ''))
                    }}>
                      編集
                    </button>
                    <button className="secondary" onClick={async () => {
                      await api.del(`/participants/${p.id}`)
                      onRefresh()
                    }}>
                      削除
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
 

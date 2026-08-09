import { useState, useEffect, useRef } from 'react'
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
  const playerNameInputRef = useRef<HTMLInputElement>(null)
  const [pFiltered,   setPFiltered]   = useState<Player[]>([])
  const [pShowList,   setPShowList]   = useState(false)
  const [pPlayerId,   setPPlayerId]   = useState('')
  const [pNumber,     setPNumber]     = useState('')

  const [editingId,  setEditingId]  = useState<number | null>(null)
  const [editRoleId, setEditRoleId] = useState('')
  const [editNumber, setEditNumber] = useState('')
  const [roleAssign, setRoleAssign] = useState<Record<number, string>>({})
// roleId → 参加者番号（カンマ・スペース区切りで複数可）

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
  game_id: Number(gameId),
  player_id: Number(playerId),
  participant_number: pNumber ? Number(pNumber) : null,
})
setPPlayerText(''); setPPlayerId(''); setPNumber('')
    onRefresh()
    requestAnimationFrame(() => playerNameInputRef.current?.focus())
  }

  const saveEdit = async (p: Participant) => {
    await api.put(`/participants/${p.id}`, {
      role_id:            Number(editRoleId),
      participant_number: editNumber ? Number(editNumber) : null,
      survived:           p.survived,
    })
    setEditingId(null)
    onRefresh()
  }

const assignRoles = async () => {
  // 番号→役職IDのマップを作成
  const numToRoleId: Record<number, number> = {}
  for (const [roleId, numsStr] of Object.entries(roleAssign)) {
    const nums = numsStr
      .split(/[\s,、.]+/)
      .map(n => parseInt(n))
      .filter(n => !isNaN(n))
    for (const num of nums) {
      numToRoleId[num] = Number(roleId)
    }
  }

  // 村人ロールのIDを取得（役職名が「村人」のもの）
  const villager = roles.find(r => r.name === '村人')

  await Promise.all(
    participants.map(p => {
      const num = p.participant_number ?? -1
      const roleId = numToRoleId[num] ?? villager?.id
      if (roleId == null) return
      return api.put(`/participants/${p.id}`, {
        role_id: roleId,
        participant_number: p.participant_number,
        survived: p.survived,
      })
    })
  )

  setRoleAssign({})
  onRefresh()
}

  return (
    <div className="card">
      <h2>参加者・役職</h2>
      <form onSubmit={addParticipant}>
        <div style={{ position: 'relative' }}>
          <input
            ref={playerNameInputRef}
            value={pPlayerText}
            lang="ja-JP"
            inputMode="text"
            autoComplete="off"
            className="player-name-input"
            style={{ imeMode: 'active' } as React.CSSProperties}
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
          {/* 候補ドロップダウン（不要になったので非表示化。復活させたい場合はこのブロックのコメントを外す）
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
          */}
        </div>
        <input
          type="number" min="1"
          value={pNumber}
          onChange={e => setPNumber(e.target.value)}
          placeholder="番号"
          style={{ width: 70 }}
        />
        <button
          type="submit"
          // ボタンへフォーカスを移さず、IMEの状態を維持する。
          onMouseDown={e => e.preventDefault()}
        >
          追加
        </button>
      </form>

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
                ) : (p.role_name ?? '―')}
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
            {/* 役職割り当てセクション */}
      {participants.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ marginBottom: 8 }}>役職割り当て</h3>
          <p style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
            特殊役職の参加者番号を入力（複数はカンマ・スペース・ピリオド区切り）。未入力の参加者は村人になります。
          </p>
          <table>
            <tbody>
              {[...roles]
  .filter(r => r.name !== '村人')
  .sort((a, b) => {
    const order = ['人狼', '狂人', '占い師', '霊媒師', '騎士']
    const ai = order.indexOf(a.name)
    const bi = order.indexOf(b.name)
    const aOrder = ai === -1 ? 999 : ai
    const bOrder = bi === -1 ? 999 : bi
    return aOrder - bOrder
  })
  .map(r => (
                <tr key={r.id}>
                  <td style={{ paddingRight: 12, whiteSpace: 'nowrap' }}>{r.name}</td>
                  <td>
                    <input
                      value={roleAssign[r.id] ?? ''}
                      onChange={e =>
                        setRoleAssign(prev => ({ ...prev, [r.id]: e.target.value }))
                      }
                      placeholder="例: 3.7.11"
                      style={{ width: 160 }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            type="button"
            style={{ marginTop: 8 }}
            onClick={assignRoles}
          >
            一括割り当て（残り全員を村人に）
          </button>
        </div>
      )}
    </div>
  )
}

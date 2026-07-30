import { useState, useEffect } from 'react'
import { api } from '../api'
import type { Player } from '../types' 

export default function Players() {
  const [players, setPlayers] = useState<Player[]>([])
  const [name, setName] = useState('')
  const [cleaning, setCleaning] = useState(false)

  const load = () => api.get('/players').then(setPlayers)
  useEffect(() => { load() }, [])

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    await api.post('/players', { name })
    setName('')
    load()
  }

  const cleanupOrphans = async () => {
    setCleaning(true)
    try {
      const result = await api.del<{ deleted: number }>('/players/orphans')
      if (result.deleted === 0) {
        alert('参加している試合がないプレイヤーは見つかりませんでした。')
      } else {
        alert(`${result.deleted} 件のプレイヤーを削除しました（参加していた試合が存在しないため）。`)
      }
      load()
    } finally {
      setCleaning(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>プレイヤー</h1>
        <button className="secondary" onClick={cleanupOrphans} disabled={cleaning}>
          {cleaning ? '整理中…' : '孤立プレイヤーを整理'}
        </button>
      </div>
      <form onSubmit={add}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="名前" required />
        <button type="submit">追加</button>
      </form>
      <table>
        <thead><tr><th>ID</th><th>名前</th></tr></thead>
        <tbody>
          {players.map(p => (
            <tr key={p.id}><td>{p.id}</td><td>{p.name}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

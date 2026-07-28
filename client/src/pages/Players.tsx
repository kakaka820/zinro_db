import { useState, useEffect } from 'react'
import { api } from '../api'

export default function Players() {
  const [players, setPlayers] = useState([])
  const [name, setName] = useState('')

  const load = () => api.get('/players').then(setPlayers)
  useEffect(() => { load() }, [])

  const add = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    await api.post('/players', { name })
    setName('')
    load()
  }

  return (
    <div>
      <h1>プレイヤー</h1>
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

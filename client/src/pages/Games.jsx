
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

export default function Games() {
  const [games, setGames]   = useState([])
  const [date, setDate]     = useState('')
  const [result, setResult] = useState('')
  const [notes, setNotes]   = useState('')

  const load = () => api.get('/games').then(setGames)
  useEffect(() => { load() }, [])

  const add = async (e) => {
    e.preventDefault()
    await api.post('/games', { played_at: date, result: result || null, notes: notes || null })
    setDate(''); setResult(''); setNotes('')
    load()
  }

  return (
    <div>
      <h1>試合一覧</h1>
      <form onSubmit={add}>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        <select value={result} onChange={e => setResult(e.target.value)}>
          <option value="">結果（未定）</option>
          <option value="village_win">村勝利</option>
          <option value="wolf_win">人狼勝利</option>
          <option value="other">その他</option>
        </select>
        <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="メモ（任意）" />
        <button type="submit">試合を追加</button>
      </form>
      <table>
        <thead><tr><th>ID</th><th>日付</th><th>結果</th><th>メモ</th><th></th></tr></thead>
        <tbody>
          {games.map(g => (
            <tr key={g.id}>
              <td>{g.id}</td>
              <td>{g.played_at?.slice(0,10)}</td>
              <td>{g.result ?? '—'}</td>
              <td>{g.notes ?? '—'}</td>
              <td><Link to={`/games/${g.id}`}>記録する →</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

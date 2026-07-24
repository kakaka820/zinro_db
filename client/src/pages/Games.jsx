import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

export default function Games() {
  const [games, setGames]   = useState([])
  const [date, setDate]     = useState('')
  const [result, setResult] = useState('')
  const [notes, setNotes]   = useState('')

  const [deleteMode, setDeleteMode] = useState(false)
  const [selected, setSelected]     = useState(new Set())

  const load = () => api.get('/games').then(setGames)
  useEffect(() => { load() }, [])

  const add = async (e) => {
    e.preventDefault()
    await api.post('/games', { played_at: date, result: result || null, notes: notes || null })
    setDate(''); setResult(''); setNotes('')
    load()
  }

  const toggleDeleteMode = () => {
    setDeleteMode(m => !m)
    setSelected(new Set())
  }
  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  const execDelete = async () => {
    if (selected.size === 0) return
    if (!window.confirm(`${selected.size} 件の試合を削除しますか？\n（関連する投票・吊り・噛みのデータもすべて消えます）`)) return
    await api.del('/games', { ids: [...selected] })
    setDeleteMode(false)
    setSelected(new Set())
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
        <thead>
          <tr>
            {deleteMode && <th />}
            <th>ID</th>
            <th>日付</th>
            <th>結果</th>
            <th>メモ</th>
            <th style={{ textAlign: 'right' }}>
              {deleteMode ? (
                <>
                  <button onClick={execDelete} disabled={selected.size === 0}
                    style={{ marginRight: 8, color: 'red' }}>
                    {selected.size > 0 ? `${selected.size} 件削除` : '削除'}
                  </button>
                  <button className="secondary" onClick={toggleDeleteMode}>キャンセル</button>
                </>
              ) : (
                <button className="secondary" onClick={toggleDeleteMode}>削除</button>
              )}
            </th>
          </tr>
        </thead>
        <tbody>
          {games.map(g => (
            <tr key={g.id}>
              {deleteMode && (
                <td>
                  <input type="checkbox"
                    checked={selected.has(g.id)}
                    onChange={() => toggleSelect(g.id)} />
                </td>
              )}
              <td>{g.id}</td>
              <td>{g.played_at?.slice(0, 10)}</td>
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

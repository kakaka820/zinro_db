import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import type { Game } from '../types'  



export default function Games() {
  const [games, setGames]   = useState<Game[]>([])
  const [date, setDate]     = useState('')
  const [result, setResult] = useState('')
  const [notes, setNotes]   = useState('')

  const [deleteMode, setDeleteMode] = useState(false)
  const [selected, setSelected]     = useState<Set<number>>(new Set())

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editDate,   setEditDate]   = useState('')
  const [editResult, setEditResult] = useState('')
  const [editNotes,  setEditNotes]  = useState('')

  const load = () => api.get('/games').then(setGames)
  useEffect(() => { load() }, [])

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    await api.post('/games', { played_at: date, result: result || null, notes: notes || null })
    setDate(''); setResult(''); setNotes('')
    load()
  }

  const startEdit = (g: Game) => {
    setEditingId(g.id)
    setEditDate(g.played_at?.slice(0, 10) ?? '')
    setEditResult(g.result ?? '')
    setEditNotes(g.notes ?? '')
  }

  const saveEdit = async (id: number) => {
    await api.put(`/games/${id}`, {
      played_at: editDate || null,
      result:    editResult || null,
      notes:     editNotes || null,
    })
    setEditingId(null)
    load()
  }

  const toggleDeleteMode = () => {
    setDeleteMode(m => !m)
    setSelected(new Set())
  }
  const toggleSelect = (id: number) => {
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
              {editingId === g.id ? (
                <>
                  <td><Link to={`/games/${g.id}/view`}>{g.id}</Link></td>
                  <td>
                    <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />
                  </td>
                  <td>
                    <select value={editResult} onChange={e => setEditResult(e.target.value)}>
                      <option value="">結果（未定）</option>
                      <option value="village_win">村勝利</option>
                      <option value="wolf_win">人狼勝利</option>
                      <option value="other">その他</option>
                    </select>
                  </td>
                  <td>
                    <input value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="メモ（任意）" />
                  </td>
                  <td style={{ textAlign: 'right', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={() => saveEdit(g.id)}>保存</button>
                    <button className="secondary" onClick={() => setEditingId(null)}>キャンセル</button>
                  </td>
                </>
              ) : (
                <>
                  <td><Link to={`/games/${g.id}/view`}>{g.id}</Link></td>
                  <td>{g.played_at?.slice(0, 10)}</td>
                  <td>{g.result ?? '—'}</td>
                  <td>{g.notes ?? '—'}</td>
                  <td style={{ textAlign: 'right', display: 'flex', gap: 12, justifyContent: 'flex-end', alignItems: 'center' }}>
                    {!deleteMode && (
                      <button className="secondary" onClick={() => startEdit(g)}>編集</button>
                    )}
                    <Link to={`/games/${g.id}`}>記録する →</Link>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { api } from '../api'

export default function Roles() {
  const [roles, setRoles] = useState([])
  const [name, setName] = useState('')
  const [team, setTeam] = useState('village')

  const load = () => api.get('/roles').then(setRoles)
  useEffect(() => { load() }, [])

  const add = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    await api.post('/roles', { name, team })
    setName('')
    load()
  }

  return (
    <div>
      <h1>役職</h1>
      <form onSubmit={add}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="役職名（例：村人）" required />
        <select value={team} onChange={e => setTeam(e.target.value)}>
          <option value="village">村陣営</option>
          <option value="wolf">人狼陣営</option>
          <option value="other">第三陣営</option>
        </select>
        <button type="submit">追加</button>
      </form>
      <table>
        <thead><tr><th>ID</th><th>役職名</th><th>陣営</th></tr></thead>
        <tbody>
          {roles.map(r => (
            <tr key={r.id}>
              <td>{r.id}</td>
              <td>{r.name}</td>
              <td><span className={`tag ${r.team}`}>{r.team}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

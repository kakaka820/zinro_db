import { Routes, Route, Link } from 'react-router-dom'
import Players    from './pages/Players'
import Roles      from './pages/Roles'
import Games      from './pages/Games'
import GameDetail from './pages/GameDetail'
import GameView   from './pages/GameView'
import type { FC } from 'react'

const App: FC = () => {
  return (
    <div>
      <nav className="nav">
        <Link to="/">試合一覧</Link>
        <Link to="/players">プレイヤー</Link>
        <Link to="/roles">役職</Link>
      </nav>
      <main className="main">
        <Routes>
          <Route path="/"            element={<Games />} />
          <Route path="/players"     element={<Players />} />
          <Route path="/roles"       element={<Roles />} />
          <Route path="/games/:id"   element={<GameDetail />} />
          <Route path="/games/:id/view"  element={<GameView />} />
        </Routes>
      </main>
    </div>
  )
}
export default App


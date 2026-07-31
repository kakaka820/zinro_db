import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api'
import ParticipantSection from './ParticipantSection'
import VoteSection, { VoteSectionHandle } from './VoteSection'
import RunoffVoteSection, { RunoffVoteSectionHandle } from './RunoffVoteSection'
import ExecutionSection, { ExecutionSectionHandle } from './ExecutionSection'
import NightKillSection, { NightKillSectionHandle } from './NightKillSection'
import COSection from './COSection'
import type { Player, Role, Participant, Execution, NightKill, Vote } from '../types'

export default function GameDetail() {
  const { id } = useParams<{ id: string }>()

  const [players,      setPlayers]      = useState<Player[]>([])
  const [roles,        setRoles]        = useState<Role[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [executions,   setExecutions]   = useState<Execution[]>([])
  const [nightKills,   setNightKills]   = useState<NightKill[]>([])
  const [votes,        setVotes]        = useState<Vote[]>([])
  const [day,          setDay]          = useState(1)
  const [activeTab,    setActiveTab]    = useState<'log' | 'co'>('log')
  const [savingAll,    setSavingAll]    = useState(false)

  const voteSectionRef   = useRef<VoteSectionHandle>(null)
  const runoffSectionRef = useRef<RunoffVoteSectionHandle>(null)
  const executionSectionRef = useRef<ExecutionSectionHandle>(null)
  const nightKillSectionRef = useRef<NightKillSectionHandle>(null)

  const loadPlayers      = () => api.get<Player[]>('/players').then(setPlayers)
  const loadParticipants = () => api.get<Participant[]>(`/participants/game/${id}`).then(setParticipants)
  const loadExecutions   = () => api.get<Execution[]>(`/executions/game/${id}`).then(setExecutions)
  const loadNightKills   = () => api.get<NightKill[]>(`/night-kills/game/${id}`).then(setNightKills)
  const loadVotes        = () => api.get<Vote[]>(`/votes/game/${id}/day/${day}`).then(setVotes)
  
  const flushAllDrafts = async () => {
  await voteSectionRef.current?.flush()
  await executionSectionRef.current?.flush()
  await runoffSectionRef.current?.flush()
  await nightKillSectionRef.current?.flush()
}

const handleSaveAllClick = async () => {
  if (savingAll) return
  setSavingAll(true)
  try {
    await flushAllDrafts()
    alert('入力中の内容をまとめて保存しました')
  } catch (err) {
    console.error(err)
    alert('保存中にエラーが発生しました。内容を確認してください。')
  } finally {
    setSavingAll(false)
  }
}

const goToNextDay = async () => {
  try {
    await flushAllDrafts()
  } catch (err) {
    console.error(err)
    if (!window.confirm('入力中の内容の保存に失敗した可能性があります。このまま次の日に進みますか？')) return
  }
  setDay(d => d + 1)
  document.getElementById('vote-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

  useEffect(() => {
    loadPlayers()
    api.get<Role[]>('/roles').then(setRoles)
    loadParticipants()
  }, [id])

  useEffect(() => {
    loadExecutions()
    loadNightKills()
  }, [id])

  useEffect(() => {
    loadVotes()
  }, [id, day])
  

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
        <h1 style={{ margin: 0 }}>試合 #{id} 記録</h1>
        <Link to={`/games/${id}/view`}>👁 確認モード</Link>
      </div>

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

      {activeTab === 'log' && (
        <>
          <ParticipantSection
            gameId={id!}
            players={players}
            roles={roles}
            participants={participants}
            executions={executions}
            nightKills={nightKills}
            day={day}
            onRefresh={loadParticipants}
            onPlayersRefresh={loadPlayers}
          />

          <div className="card">
            <h2>日付選択</h2>
            <form style={{ marginBottom: 0 }}>
              <label>何日目：</label>
              <input
                type="number" min="1" value={day}
                onChange={e => setDay(Number(e.target.value))}
                style={{ width: 80 }}
              />
            </form>
          </div>

          <VoteSection
  ref={voteSectionRef}
  gameId={id!}
  participants={participants}
  day={day}
  votes={votes}
  onRefresh={loadVotes}
/>

          <ExecutionSection
            ref={executionSectionRef}
            gameId={id}
            participants={participants}
            executions={executions}
            day={day}
            onRefresh={loadExecutions}
          />

          <RunoffVoteSection
            ref={runoffSectionRef}
            gameId={id!}
            participants={participants}
            day={day}
            executions={executions}
            votes={votes}
            onRefresh={loadVotes}
          />


          
          <NightKillSection
            ref={nightKillSectionRef}
            gameId={id}
            participants={participants}
            nightKills={nightKills}
            day={day}
            onRefresh={loadNightKills}
          />

          <div className="card" style={{ textAlign: 'center', display: 'flex', justifyContent: 'center', gap: 12 }}>
  <button
    type="button" className="secondary"
    onClick={handleSaveAllClick} disabled={savingAll}
    style={{ fontSize: 16, padding: '10px 24px' }}
  >
    {savingAll ? '保存中…' : '📝 まとめて保存'}
  </button>
  <button type="button" onClick={goToNextDay} style={{ fontSize: 16, padding: '10px 24px' }}>
    {day + 1}日目へ進む ↑ 投票へ
  </button>
</div>
        </>
      )}

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

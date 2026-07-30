import { useState, useEffect } from 'react'
import { api, coEventsApi, seerResultsApi, mediumResultsApi, knightGuardsApi } from '../api'
import CoEventSection from './CoEventSection'
import SeerSection from './SeerSection'
import MediumSection from './MediumSection'
import KnightSection from './KnightSection'
import type { Participant, Role, CoEvent, SeerResult, MediumResult, KnightGuard, Execution, NightKill } from '../types'

type Props = {
  gameId: string | number
  participants: Participant[]
  roles: Role[]
}

export default function COSection({ gameId, participants, roles }: Props) {
  const [coEvents,      setCoEvents]      = useState<CoEvent[]>([])
  const [seerResults,   setSeerResults]   = useState<SeerResult[]>([])
  const [mediumResults, setMediumResults] = useState<MediumResult[]>([])
  const [knightGuards,  setKnightGuards]  = useState<KnightGuard[]>([])
  const [executions,    setExecutions]    = useState<Execution[]>([])
  const [nightKills,    setNightKills]    = useState<NightKill[]>([])

  // 並列ロード（直列→並列に改善）
  const load = async () => {
    const [co, seer, medium, knight, exec, nk] = await Promise.all([
      coEventsApi.list(gameId),
      seerResultsApi.list(gameId),
      mediumResultsApi.list(gameId),
      knightGuardsApi.list(gameId),
      api.get<Execution[]>(`/executions/game/${gameId}`),
      api.get<NightKill[]>(`/night-kills/game/${gameId}`),
    ])
    setCoEvents(co)
    setSeerResults(seer)
    setMediumResults(medium)
    setKnightGuards(knight)
    setExecutions(exec)
    setNightKills(nk)
  }

  useEffect(() => { load() }, [gameId])

const getVisibleMediumResults = (mediumCo: CoEvent, currentDay: number) => {
  const deathNight = getMediumDeathNight(mediumCo)
  
  // 霊媒師が死んでいれば、死んだ夜以降の開示分は非表示
  // 例：2夜に噛まれた → disclosed_day <= 2 のもののみ表示
  const maxDisclosedDay = deathNight ?? Infinity

  return mediumResults.filter(mr =>
    mr.medium_co_id === mediumCo.id &&
    mr.disclosed_day <= currentDay &&    // 現在日以前
    mr.disclosed_day <= maxDisclosedDay  // 霊媒師生存期間内
  )
}

  
  // 本物の役職を自動追加
  useEffect(() => {
    if (!participants.length || !roles.length) return
    ;(async () => {
      const needsCoRoleIds = new Set(roles.filter(r => r.needs_co).map(r => r.id))
      const current = await coEventsApi.list(gameId)
      const existingIds = new Set(current.map(c => c.participant_id))
      const toAdd = participants.filter(
        p => needsCoRoleIds.has(p.role_id) && !existingIds.has(p.id)
      )
      for (const p of toAdd) {
        await coEventsApi.add({
          game_id:         Number(gameId),
          participant_id:  p.id,
          claimed_role_id: p.role_id,
          co_day:          null,
        })
      }
      if (toAdd.length > 0) load()
    })()
  }, [participants, roles])

  const isFake = (co: CoEvent) => {
    const p = participants.find(p => p.id === co.participant_id)
    return p != null && String(p.role_id) !== String(co.claimed_role_id)
  }

  const cosByRole = (roleName: string) =>
    coEvents.filter(co => co.claimed_role_name === roleName)

  return (
    <div>
      <CoEventSection
        gameId={gameId}
        participants={participants}
        roles={roles}
        coEvents={coEvents}
        isFake={isFake}
        onRefresh={load}
      />
      <SeerSection
        gameId={gameId}
        participants={participants}
        coEvents={coEvents}
        seers={cosByRole('占い師')}
        seerResults={seerResults}
        isFake={isFake}
        onRefresh={load}
      />
      <MediumSection
        gameId={gameId}
        participants={participants}
        coEvents={coEvents}
        mediums={cosByRole('霊媒師')}
        mediumResults={mediumResults}
        executions={executions}
        nightKills={nightKills}
        isFake={isFake}
        onRefresh={load}
      />
      <KnightSection
        gameId={gameId}
        participants={participants}
        coEvents={coEvents}
        knights={cosByRole('騎士')}
        knightGuards={knightGuards}
        isFake={isFake}
        onRefresh={load}
      />
    </div>
  )
}

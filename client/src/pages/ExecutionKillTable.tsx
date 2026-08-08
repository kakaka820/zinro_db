import type { Participant, Execution, NightKill, KnightGuard, CoEvent, MediumResult } from '../types'

type Props = {
  participants:  Participant[]
  executions:    Execution[]
  nightKills:    NightKill[]
  knightGuards:  KnightGuard[]
  coEvents:      CoEvent[]
  mediumResults: MediumResult[]
  maxDay:        number   // 表示する列数（試合全体の最大日数。閲覧中の日に関わらず固定）
  viewDay:       number   // 現在閲覧中の日（ここまでのデータのみ数字を表示）
}

// ── 三角分割ヘッダーセル ──────────────────────────────────────────
// TL-BR の対角線で「吊り（左下）」と「上部」に二分し、
// さらに上部を TR→中心 の線で「護衛（左上寄り）」と「噛み（右下寄り）」に分割する。
type TriHeaderProps = {
  dayNumber: number
  execLabel: string | null   // 吊られた人（例: "7"）。記録なしは null
  guardLabel: string | null  // 護衛先（非公開/未記録なら null）
  killLabel:  string | null  // 噛まれた人 or "GJ"。記録なしは null
}
function TriDiagonalHeader({ dayNumber, execLabel, guardLabel, killLabel }: TriHeaderProps) {
  const CELL = 60
  const C = CELL / 2

  const textStyle = (filled: boolean, color: string) => ({
    fontSize: 10,
    fontWeight: 'bold' as const,
    fill: filled ? color : '#ccc',
  })

  return (
    <th style={{ padding: 0, border: '1px solid #bbb', width: CELL, minWidth: CELL, height: CELL }}>
      <svg width={CELL} height={CELL} style={{ display: 'block' }}>
        {/* 区切り線 */}
        <line x1={0} y1={0} x2={CELL} y2={CELL} stroke="#aaa" strokeWidth={1} />
        <line x1={CELL} y1={0} x2={C} y2={C} stroke="#aaa" strokeWidth={1} />

        {/* 日付ラベル（上端中央、小さく） */}
        <text x={C} y={8} textAnchor="middle" fontSize={8} fill="#999">
          {dayNumber}日
        </text>

        {/* 吊り：左下の三角（TL, BL, BR） */}
        <text x={C * 0.55} y={CELL - 7} textAnchor="middle" style={textStyle(!!execLabel, '#111')}>
          {execLabel ?? '吊'}
        </text>

        {/* 護衛：上の三角のうち TL 側（TL, TR, C） */}
        <text x={C} y={22} textAnchor="middle" style={textStyle(!!guardLabel, '#2563eb')}>
          {guardLabel ?? '護'}
        </text>

        {/* 噛み：上の三角のうち BR 側（TR, BR, C） */}
        <text x={CELL - 12} y={C + 4} textAnchor="middle" style={textStyle(!!killLabel, '#c00')}>
          {killLabel ?? '噛'}
        </text>
      </svg>
    </th>
  )
}

// ── メインコンポーネント ──────────────────────────────────────────
export default function ExecutionKillTable({
  participants, executions, nightKills, knightGuards, coEvents, mediumResults, maxDay, viewDay,
}: Props) {
  const getNum = (pid: number | null) =>
    pid == null ? null : participants.find(p => p.id === pid)?.participant_number ?? '?'

  const days = Array.from({ length: Math.max(maxDay, 1) }, (_, i) => i + 1)

  const rowCell: React.CSSProperties = {
    border: '1px solid #bbb', textAlign: 'center', fontSize: 12, padding: '3px 0', minWidth: 60,
  }
  const nameCell: React.CSSProperties = {
    ...rowCell, fontWeight: 'bold', background: '#fafafa', minWidth: 60,
  }

  // 霊媒師CO済みの参加者を co_day 順に取得
  const mediumCOs = coEvents
    .filter(c => c.claimed_role_name === '霊媒師')
    .sort((a, b) => (a.co_day ?? 999) - (b.co_day ?? 999))

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: 'auto' }}>
        <thead>
          <tr>
            <th></th>
            {days.map(d => {
              const exec = d <= viewDay ? executions.find(e => e.day_number === d && e.participant_id != null) : undefined
              const kill = d <= viewDay ? nightKills.find(n => n.day_number === d) : undefined
              // 護衛成功の事実（is_gj）は噛み結果と同じく「その日が来れば常に公開情報」として扱う。
              // 護衛"対象"の氏名だけが秘匿情報なので、disclosed_day はそちらのみをゲートする。
              const guard = d <= viewDay ? knightGuards.find(g => g.day_number === d) : undefined
              const guardTargetDisclosed =
                !!guard && guard.disclosed_day != null && guard.disclosed_day <= viewDay

              const execLabel = exec ? String(getNum(exec.participant_id)) : null
              const killLabel = kill ? (kill.participant_id == null ? 'GJ' : String(getNum(kill.participant_id))) : null
              const guardLabel = guard
                ? (guardTargetDisclosed && guard.target_participant_id != null
                    ? String(getNum(guard.target_participant_id))
                    : (guard.is_gj ? 'GJ' : null))
                : null

              return (
                <TriDiagonalHeader
                  key={d}
                  dayNumber={d}
                  execLabel={execLabel}
                  guardLabel={guardLabel}
                  killLabel={killLabel}
                />
              )
            })}
          </tr>
        </thead>
        <tbody>
          {/* 霊媒師CO者ごとの行：左列＝COした人の番号、各日＝その日の霊結果 */}
          {mediumCOs.map(co => (
            <tr key={co.id}>
              <td style={nameCell}>{co.participant_number ?? '?'}</td>
              {days.map(d => {
                const result = d <= viewDay ? mediumResults.find(
                  r => r.medium_participant_id === co.participant_id &&
                       r.day_number === d && r.disclosed_day != null
                ) : undefined
                const label = result ? (result.result === 'black' ? 'W' : '○') : ''
                return (
                  <td
                    key={d}
                    style={{ ...rowCell, color: result?.result === 'black' ? '#c00' : '#080', fontWeight: 'bold' }}
                  >
                    {label}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

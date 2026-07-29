import type { Participant, Execution, NightKill, KnightGuard } from '../types'

type Props = {
  participants: Participant[]
  executions:   Execution[]
  nightKills:   NightKill[]
  knightGuards: KnightGuard[]
  maxDay:       number   // 表示する最大日数（呼び出し側で算出）
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

// ── メインコンポーネント（現時点ではヘッダー行のみ） ──────────────────
export default function ExecutionKillTable({
  participants, executions, nightKills, knightGuards, maxDay,
}: Props) {
  const getNum = (pid: number | null) =>
    pid == null ? null : participants.find(p => p.id === pid)?.participant_number ?? '?'

  const days = Array.from({ length: Math.max(maxDay, 1) }, (_, i) => i + 1)

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {days.map(d => {
              const exec = executions.find(e => e.day_number === d && e.participant_id != null)
              const kill = nightKills.find(n => n.day_number === d)
              const guard = knightGuards.find(g => g.day_number === d && g.disclosed_day != null)

              const execLabel = exec ? String(getNum(exec.participant_id)) : null
              const killLabel = kill ? (kill.participant_id == null ? 'GJ' : String(getNum(kill.participant_id))) : null
              const guardLabel = guard ? (guard.target_participant_id == null ? 'GJ' : String(getNum(guard.target_participant_id))) : null

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
        {/* 行（参加者ごとの内訳など）は仕様確定後に追加 */}
      </table>
    </div>
  )
}

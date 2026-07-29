import { useState } from 'react'
import type { Participant, CoEvent, SeerResult, MediumResult, KnightGuard } from '../types'

// ── 列定義 ────────────────────────────────────────────────────────
// 占い師4枠・霊媒師3枠・騎士2枠（固定スロット数）
const SEER_SLOTS   = 4
const MEDIUM_SLOTS = 3
const KNIGHT_SLOTS = 2

type CoSlot = {
  co:    CoEvent | null  // null = 空枠
  role:  '占い師' | '霊媒師' | '騎士'
  index: number          // 役職内の何番目の枠か（0始まり）
}

type Props = {
  participants:  Participant[]
  coEvents:      CoEvent[]
  seerResults:   SeerResult[]
  mediumResults: MediumResult[]
  knightGuards:  KnightGuard[]
  isFake:        (co: CoEvent) => boolean
}

// ── 斜線ヘッダーセル ──────────────────────────────────────────────
function DiagonalHeader({ co }: { co: CoEvent | null }) {
  const CELL = 52  // セルの正方形サイズ(px)

  return (
    <th style={{
      position:    'relative',
      width:       CELL,
      height:      CELL,
      minWidth:    CELL,
      padding:     0,
      border:      '1px solid #bbb',
      background:  `linear-gradient(
        to bottom right,
        white calc(50% - 0.6px),
        #aaa  calc(50% - 0.6px),
        #aaa  calc(50% + 0.6px),
        white calc(50% + 0.6px)
      )`,
      verticalAlign: 'middle',
      overflow:    'hidden',
    }}>
      {/* 右上 = 何番 */}
      <span style={{
        position:   'absolute',
        top:        3,
        right:      4,
        fontSize:   10,
        fontWeight: 'bold',
        lineHeight: 1,
        color:      co ? '#111' : '#ccc',
      }}>
        {co ? co.participant_number : '番'}
      </span>
      {/* 左下 = 何日目 */}
      <span style={{
        position:   'absolute',
        bottom:     3,
        left:       4,
        fontSize:   10,
        fontWeight: 'bold',
        lineHeight: 1,
        color:      co ? '#111' : '#ccc',
      }}>
        {co?.co_day != null ? `${co.co_day}日` : (co ? '?' : '日')}
      </span>
    </th>
  )
}

// ── メインコンポーネント ───────────────────────────────────────────
export default function CoStatusTable({
  participants, coEvents, seerResults, mediumResults, knightGuards, isFake,
}: Props) {
  const [showNames, setShowNames] = useState(true)   // デフォルト：表示
  const [showRole,  setShowRole]  = useState(false)  // デフォルト：非表示

  const sortedP = [...participants].sort(
    (a, b) => (a.participant_number ?? 999) - (b.participant_number ?? 999)
  )

  // 各役職のCOを co_day 順に並べてスロットに割り当て
  const slotsByRole = (role: '占い師' | '霊媒師' | '騎士', maxSlots: number): CoSlot[] => {
    const cos = coEvents
      .filter(co => co.claimed_role_name === role)
      .sort((a, b) => (a.co_day ?? 999) - (b.co_day ?? 999))
    return Array.from({ length: maxSlots }, (_, i) => ({
      co:    cos[i] ?? null,
      role,
      index: i,
    }))
  }

  const seerSlots   = slotsByRole('占い師', SEER_SLOTS)
  const mediumSlots = slotsByRole('霊媒師', MEDIUM_SLOTS)
  const knightSlots = slotsByRole('騎士',   KNIGHT_SLOTS)
  const allSlots    = [...seerSlots, ...mediumSlots, ...knightSlots]

  // 参加者ごとのセル値（今は空文字 = 将来の結果表示用プレースホルダ）
  const getCellValue = (_p: Participant, _slot: CoSlot): string => {
    // TODO: 各役職の結果をここで返す
    return ''
  }

  // ── スタイル定数 ─────────────────────────────────────────────
  const borderCell: React.CSSProperties = {
    border:    '1px solid #bbb',
    textAlign: 'center',
    padding:   '3px 6px',
    fontSize:  12,
  }
  const groupBorder: React.CSSProperties = {
    borderLeft: '2px solid #666',
  }
  const fakeStyle: React.CSSProperties = {
    color:      '#c00',
    fontWeight: 'bold',
  }

  return (
    <div style={{ marginTop: 8 }}>
      {/* 表示切替ボタン */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <button
          type="button" className="secondary"
          style={{ fontSize: 12, padding: '2px 10px' }}
          onClick={() => setShowNames(v => !v)}
        >
          {showNames ? '名前を隠す' : '名前を表示'}
        </button>
        <button
          type="button" className="secondary"
          style={{ fontSize: 12, padding: '2px 10px' }}
          onClick={() => setShowRole(v => !v)}
        >
          {showRole ? '役職を隠す' : '役職を表示'}
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', minWidth: 'max-content' }}>
        <thead>
          <tr>
            {/* 固定左列ヘッダー */}
            <th style={{ ...borderCell, background: '#f5f5f5', minWidth: 32 }}>番号</th>
            {showNames && <th style={{ ...borderCell, background: '#f5f5f5', minWidth: 64 }}>名前</th>}
            {showRole  && <th style={{ ...borderCell, background: '#f5f5f5', minWidth: 52 }}>役職</th>}

            {/* CO列ヘッダー（斜線セル） */}
            {allSlots.map((slot, i) => {
              const isGroupStart =
                (slot.role === '霊媒師' && slot.index === 0) ||
                (slot.role === '騎士'   && slot.index === 0)
              return (
                <th
                  key={`slot-${i}`}
                  style={isGroupStart ? groupBorder : {}}
                >
                  <DiagonalHeader co={slot.co} />
                </th>
              )
            })}
          </tr>

        </thead>

        <tbody>
          {sortedP.map(p => (
            <tr key={p.id}>
              {/* 番号 */}
              <td style={{ ...borderCell, fontWeight: 'bold', background: '#fafafa' }}>
                {p.participant_number}
              </td>
              {/* 名前 */}
              {showNames && (
                <td style={{ ...borderCell, background: '#fafafa', whiteSpace: 'nowrap' }}>
                  {p.player_name}
                </td>
              )}
              {/* 役職 */}
              {showRole && (
                <td style={{ ...borderCell, background: '#fafafa', whiteSpace: 'nowrap' }}>
                  {p.role_name ?? '?'}
                </td>
              )}

              {/* CO列 */}
              {allSlots.map((slot, i) => {
                const isGroupStart =
                  (slot.role === '霊媒師' && slot.index === 0) ||
                  (slot.role === '騎士'   && slot.index === 0)
                // この列の CO 本人行はハイライト
                const isOwner = slot.co?.participant_id === p.id
                const fake    = slot.co ? isFake(slot.co) : false

                return (
                  <td
                    key={`cell-${p.id}-${i}`}
                    style={{
                      ...borderCell,
                      ...(isGroupStart ? groupBorder : {}),
                      background: isOwner
                        ? fake ? '#fce4ec' : '#e8f5e9'
                        : undefined,
                    }}
                  >
                    {isOwner && (
                      <span style={fake ? fakeStyle : { color: '#2e7d32', fontWeight: 'bold' }}>
                        {fake ? '偽' : 'CO'}
                      </span>
                    )}
                    {!isOwner && getCellValue(p, slot)}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      </div>  {/* overflowX: auto */}
    </div>
  )
}

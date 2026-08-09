import type { Participant, Vote } from '../types'

import type { KeyboardEvent } from 'react'
 function focusCell(fromEl: HTMLInputElement, row: number, col: number) {
   const scope = fromEl.closest('table') ?? document
   const el = scope.querySelector<HTMLInputElement>(
     `[data-matrix-cell="${row}-${col}"]`
   )
   if (el) { el.focus(); el.select() }
 }




type VoteMatrixInputProps = {
  participants:   Participant[]
  matrixInput:    Record<number, string[]>
  setMatrixInput: React.Dispatch<React.SetStateAction<Record<number, string[]>>>
  title?: string
  onSubmit:       () => void
 submitting:     boolean
  day:            number
  voteOrderInput:    Record<number, string>
  setVoteOrderInput: React.Dispatch<React.SetStateAction<Record<number, string>>>
  // 投票順の行を表示するかどうか（通常投票の1日目のみ想定。決選投票では表示しない）
  showVoteOrder?: boolean
}

export default function VoteMatrixInput({
  title, participants, matrixInput, setMatrixInput,
  onSubmit, submitting, day,
  voteOrderInput, setVoteOrderInput,
  showVoteOrder = false,
}: VoteMatrixInputProps) {
  const sortedP = [...participants].sort(
    (a, b) => (a.participant_number ?? 999) - (b.participant_number ?? 999)
  )
  const maxFilled = Math.max(
    0,
    ...Object.values(matrixInput).map(col => col.filter(v => v.trim()).length)
  )
  const ROWS = Math.max(3, Math.ceil(participants.length / 2), maxFilled + 1)

  // 行番号→配列インデックスは固定（ROWSに依存させない）。
  // こうしておかないと、入力中にROWSが変化した瞬間、今フォーカスしてる欄が
  // 別の配列インデックスを指すことになり、2文字目以降が別のマスに書き込まれてしまう。
  const getCell = (tid: number, row: number) => matrixInput[tid]?.[row] ?? ''
  const setCell = (tid: number, row: number, val: string) =>
    setMatrixInput(prev => {
      const col = [...(prev[tid] ?? Array(ROWS).fill(''))]
      col[row] = val
      return { ...prev, [tid]: col }
    })


const handleKeyDown = (
   e: KeyboardEvent<HTMLInputElement>,
   colIdx: number,
   row: number,
 ) => {
   const arrows = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']
   if (!arrows.includes(e.key) && e.key !== 'Enter' && e.key !== 'Tab') return
   e.preventDefault()
   const cols = sortedP.length
   let nextCol = colIdx
   let nextRow = row
   if (e.key === 'ArrowLeft')  nextCol = Math.max(0, colIdx - 1)
   if (e.key === 'ArrowRight') nextCol = Math.min(cols - 1, colIdx + 1)
   if (e.key === 'ArrowUp')    nextRow = Math.min(ROWS - 1, row + 1)
   if (e.key === 'ArrowDown' || e.key === 'Enter')  nextRow = Math.max(0, row - 1)
   // Tab: 右へ、右端まで来たら次の行の左端へ折り返す。Shift+Tabはその逆（左へ、左端なら前の行の右端へ）。
   if (e.key === 'Tab') {
     if (!e.shiftKey) {
       if (colIdx < cols - 1) { nextCol = colIdx + 1 }
       else { nextCol = 0; nextRow = Math.max(0, row - 1) }
     } else {
       if (colIdx > 0) { nextCol = colIdx - 1 }
       else { nextCol = cols - 1; nextRow = Math.min(ROWS - 1, row + 1) }
     }
   }
   focusCell(e.currentTarget, nextRow, nextCol)
 }



  

  const cell = { border: '1px solid #bbb', padding: 0 }
  const labelCell = {
    ...cell, borderTop: '2px solid #555', background: '#f5f5f5',
    textAlign: 'center' as const, fontSize: 12, fontWeight: 'bold', padding: '3px 0',
  }
  

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        {title && <span style={{ fontWeight: 'bold', fontSize: 14 }}>{title}</span>}
<button type="button" onClick={onSubmit} disabled={submitting}>
  {submitting ? '登録中…' : '一括登録'}
</button>
<button type="button" className="secondary"
  onClick={() => setMatrixInput({})} disabled={submitting}>クリア</button>
      </div>
      <p style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>
        各列の参加者番号の上のセルに、投票した人の番号を入力してください（捨て票は末尾に@を付ける。例: 5@）
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse' }}>
          <tbody>
            {Array.from({ length: ROWS }, (_, i) => ROWS - 1 - i).map(row => (
              <tr key={row}>
               {sortedP.map((p, colIdx) => (
                  <td key={p.id} style={cell}>
                    <input
                      type="text"
                      value={getCell(p.id, row)}
                      onChange={e => setCell(p.id, row, e.target.value)}
                      onKeyDown={e => handleKeyDown(e, colIdx, row)}
       data-matrix-cell={`${row}-${colIdx}`}
                      style={{ display: 'block', width: '100%', height: '100%', textAlign: 'center', fontSize: 12, border: 'none', padding: '4px 0', boxSizing: 'border-box' }}
                    />
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              {sortedP.map(p => (
                <td key={p.id} style={labelCell}>
                  {p.participant_number ?? '?'}
                </td>
              ))}
            </tr>
           {showVoteOrder && day === 1 && (
              <tr>
                {sortedP.map(p => (
                  <td key={p.id} style={cell}>
                    <input
                      type="text"
                      value={voteOrderInput[p.id] ?? ''}
                      onChange={e =>
                        setVoteOrderInput(prev => ({ ...prev, [p.id]: e.target.value }))
                      }
                      style={{ display: 'block', width: '100%', height: '100%', textAlign: 'center', fontSize: 12, border: 'none', padding: '4px 0', boxSizing: 'border-box', color: '#666' }}
                    />
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

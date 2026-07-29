import type { Participant, Vote } from '../types'

import type { KeyboardEvent } from 'react'
 function focusCell(row: number, col: number) {
   const el = document.querySelector<HTMLInputElement>(
     `[data-matrix-cell="${row}-${col}"]`
   )
   if (el) { el.focus(); el.select() }
 }




type VoteMatrixInputProps = {
  participants:   Participant[]
  matrixInput:    Record<number, string[]>
  setMatrixInput: React.Dispatch<React.SetStateAction<Record<number, string[]>>>
  matrixType:     'normal' | 'runoff'
  setMatrixType:  React.Dispatch<React.SetStateAction<'normal' | 'runoff'>>
  onSubmit:       () => void
  votes:          Vote[]
  day:            number
}

export default function VoteMatrixInput({
  participants, matrixInput, setMatrixInput,
  matrixType, setMatrixType, onSubmit, votes, day
}: VoteMatrixInputProps) {
  const sortedP = [...participants].sort(
    (a, b) => (a.participant_number ?? 999) - (b.participant_number ?? 999)
  )
  const maxFilled = Math.max(
    0,
    ...Object.values(matrixInput).map(col => col.filter(v => v.trim()).length)
  )
  const ROWS = Math.max(3, Math.ceil(participants.length / 2), maxFilled + 1)

  const getCell = (tid: number, row: number) => matrixInput[tid]?.[ROWS - 1 - row] ?? ''
  const setCell = (tid: number, row: number, val: string) =>
    setMatrixInput(prev => {
      const col = [...(prev[tid] ?? Array(ROWS).fill(''))]
      col[ROWS - 1 - row] = val
      return { ...prev, [tid]: col }
    })


const handleKeyDown = (
   e: KeyboardEvent<HTMLInputElement>,
   colIdx: number,
   row: number,
 ) => {
   const arrows = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']
   if (!arrows.includes(e.key)) return
   e.preventDefault()
   const cols = sortedP.length
   let nextCol = colIdx
   let nextRow = row
   if (e.key === 'ArrowLeft')  nextCol = Math.max(0, colIdx - 1)
   if (e.key === 'ArrowRight') nextCol = Math.min(cols - 1, colIdx + 1)
   if (e.key === 'ArrowUp')    nextRow = Math.max(0, row - 1)
   if (e.key === 'ArrowDown')  nextRow = Math.min(ROWS - 1, row + 1)
   focusCell(nextRow, nextCol)
 }



  

  const cell = { border: '1px solid #bbb', padding: 0 }
  const labelCell = {
    ...cell, borderTop: '2px solid #555', background: '#f5f5f5',
    textAlign: 'center' as const, fontSize: 12, fontWeight: 'bold', padding: '3px 0',
  }
  const orderCell = {
    ...cell, textAlign: 'center' as const, fontSize: 12, padding: '3px 0', color: '#666',
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <select value={matrixType} onChange={e => setMatrixType(e.target.value as 'normal' | 'runoff' | 'runoff2')}>
  <option value="normal">通常投票</option>
  <option value="runoff">決選投票</option>
  <option value="runoff2">2回目決選投票</option>
</select>
        <button type="button" onClick={onSubmit}>一括登録</button>
        <button type="button" className="secondary" onClick={() => setMatrixInput({})}>クリア</button>
      </div>
      <p style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>
        各列の参加者番号の上のセルに、投票した人の番号を入力してください
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse' }}>
          <tbody>
            {Array.from({ length: ROWS }, (_, row) => (
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
            {day === 1 && (
              <tr>
                {sortedP.map(p => (
                  <td key={p.id} style={orderCell}>
                    {votes.find(v => v.voter_id === p.id && v.vote_type === matrixType)?.vote_order ?? ''}
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

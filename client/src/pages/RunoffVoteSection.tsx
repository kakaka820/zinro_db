import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { api } from '../api'
import VoteMatrixInput from './VoteMatrixInput'
import type { Participant, Vote, Execution, NightKill } from '../types'
 
type Props = {
  gameId:       string
  participants: Participant[]
  day:          number
  executions:   Execution[]
  nightKills:   NightKill[]
  votes:        Vote[]
  onRefresh:    () => void
  draftIsRunoff?: boolean
}
 
// 「決選投票」の入力欄。吊り結果が「決選釣り」になった日にだけ、
// 吊り結果セクションの下に表示する（投票セクションからは分離）。
export type RunoffVoteSectionHandle = {
  flush: () => Promise<void>
}
 
const RunoffVoteSection = forwardRef<RunoffVoteSectionHandle, Props>(function RunoffVoteSection(
  { gameId, participants, day, executions, nightKills, votes, onRefresh, draftIsRunoff }, ref
) {
  const [runoffMatrix,  setRunoffMatrix]  = useState<Record<string, string[]>>({})
  const [runoff2Matrix, setRunoff2Matrix] = useState<Record<string, string[]>>({})
  const [showRunoff2,   setShowRunoff2]   = useState(false)
  const [submitting,    setSubmitting]    = useState<'runoff' | 'runoff2' | null>(null)
  const [onlySurvivors, setOnlySurvivors] = useState(false)
 
  // その日の時点で生きているかどうか（前日までの吊り・噛みで欠けていないか）。
  // ParticipantSectionのisAlive判定と同じ基準に揃えている。
  const isAlive = (pid: number) =>
    !executions.some(e => e.participant_id === pid && e.day_number < day) &&
    !nightKills.some(n => n.participant_id === pid && n.day_number < day)

  const survivors = participants.filter(p => isAlive(p.id))
  const survivorNumbers = survivors
    .map(p => p.participant_number)
    .filter((n): n is number => n != null)
    .sort((a, b) => a - b)

  // 「残りの人だけ表示」がONの時に表に渡す参加者一覧。
  // 下書き（matrixInput、参加者IDをキーに保持）はこの絞り込みの影響を受けないので、
  // 表示をOFFに戻せば非表示にしていた人の入力もそのまま残っている。
  const displayParticipants = onlySurvivors ? survivors : participants

  // 保存済みの吊り結果だけでなく、まだ保存前の下書き選択（プルダウン）が
  // 「決選吊り」になっている場合も表示対象に含める。
  const hasRunoffExecution =
    executions.some(e => e.day_number === day && e.execution_type === 'runoff_execution') ||
    !!draftIsRunoff
 
  // 「編集中(未保存の変更がある)かどうか」を追跡する。
  // 編集中でなければ votes が更新されるたびに何度でも復元してよい
  // （他セクションの保存による再取得でも、正しく最新状態に追従できる）。
  // 編集中の間だけ、他セクションの保存に巻き込まれて votes が更新されても上書きしないようにする。
  const dirtyRunoffRef  = useRef(false)
  const dirtyRunoff2Ref = useRef(false)

  useEffect(() => {
    dirtyRunoffRef.current  = false   // 日が変わったら未編集の状態に戻す
    dirtyRunoff2Ref.current = false
  }, [day])

  useEffect(() => {
    const rm: Record<string, string[]> = {}
    const r2m: Record<string, string[]> = {}
    for (const v of votes) {
      const voterNum = participants.find(p => p.id === v.voter_id)?.participant_number
      if (voterNum == null) continue
      const target = String(v.target_id)
      const label = v.is_discard ? `${voterNum}@` : String(voterNum)
      if (v.vote_type === 'runoff') {
        rm[target] = [...(rm[target] ?? []), label]
      } else if (v.vote_type === 'runoff2') {
        r2m[target] = [...(r2m[target] ?? []), label]
      }
    }
    if (!dirtyRunoffRef.current)  setRunoffMatrix(rm)
    if (!dirtyRunoff2Ref.current) setRunoff2Matrix(r2m)
    if (votes.some(v => v.vote_type === 'runoff2')) setShowRunoff2(true)
  }, [votes, participants, day])

  // ユーザーがセルを編集した/クリアした時に呼ぶ。以後、votesが更新されても上書きしない。
  const setRunoffMatrixTracked: typeof setRunoffMatrix = updater => {
    dirtyRunoffRef.current = true
    setRunoffMatrix(updater)
  }
  const setRunoff2MatrixTracked: typeof setRunoff2Matrix = updater => {
    dirtyRunoff2Ref.current = true
    setRunoff2Matrix(updater)
  }
 
  const resolveParticipant = (input: string) => {
    const trimmed = input.trim()
    const num = parseInt(trimmed, 10)
    if (!isNaN(num) && String(num) === trimmed)
      return participants.find(p => p.participant_number === num) ?? null
    return participants.find(p => p.player_name === trimmed) ?? null
  }
 
  const makeSubmitter = (
    voteType: 'runoff' | 'runoff2',
    matrixData: Record<string, string[]>,
  ) => async () => {
    if (submitting) return
    setSubmitting(voteType)
    try {
      const toSubmit: object[] = []
      for (const [targetIdStr, voterNums] of Object.entries(matrixData)) {
        for (const voterNumStr of voterNums ?? []) {
          if (!voterNumStr.trim()) continue
          // 末尾に「@」が付いていたら捨て票として扱う（例: 5@ → 5番の投票を捨て票扱い）
          const trimmed = voterNumStr.trim()
          const isDiscard = trimmed.endsWith('@')
          const voter = resolveParticipant(isDiscard ? trimmed.slice(0, -1) : trimmed)
          if (!voter) { alert(`「${voterNumStr}」が見つかりません`); return }
          // 既存の投票があれば、表では編集できない項目（受けた順番）を保持する
          const existing = votes.find(v =>
            v.voter_id === voter.id &&
            v.target_id === Number(targetIdStr) &&
            v.vote_type === voteType
          )
          toSubmit.push({
            game_id: Number(gameId), day_number: day, vote_type: voteType,
            voter_id: voter.id, target_id: Number(targetIdStr),
            vote_order: null,
            receive_order: existing?.receive_order ?? null,
            is_discard: isDiscard,
          })
        }
      }
      // 空の表を保存しても、既存の決選投票を削除しない（初期ロード前の誤爆防止）。
      // ただし、ユーザーが実際に編集（クリア含む）した後は、
      // 空の表の送信＝「全部削除する」という意思表示とみなして送信する。
      const dirtyRef = voteType === 'runoff' ? dirtyRunoffRef : dirtyRunoff2Ref
      if (toSubmit.length === 0 && !dirtyRef.current) return
      await api.post('/votes/replace', {
        game_id: Number(gameId), day_number: day, vote_type: voteType, votes: toSubmit,
      })
      dirtyRef.current = false   // 保存できたので、以後は votes の更新に素直に追従してよい
      await onRefresh()
    } finally {
      setSubmitting(null)
    }
  }
 
useImperativeHandle(ref, () => ({
    async flush() {
      // 表示判定(hasRunoffExecution)には依存しない。
      // ExecutionSectionの保存直後は、この値がまだ最新のpropsに更新されていない
      // タイミングで呼ばれる可能性があり、それに頼ると保存自体がスキップされてしまうため。
      // 実際に保存するかどうかは makeSubmitter 内部の判定（入力内容の有無・dirtyRef）に任せる。
      await makeSubmitter('runoff', runoffMatrix)()
      await makeSubmitter('runoff2', runoff2Matrix)()
    },
  }))
 
  if (!hasRunoffExecution) return null
 
  return (
    <div className="card" id="runoff-vote-section">
      <h2>{day}日目：決選投票</h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 10, fontSize: 13 }}>
        <span style={{ color: '#444' }}>
          現在の生存者番号：
          {survivorNumbers.length > 0 ? survivorNumbers.join(', ') : 'なし'}
        </span>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={onlySurvivors}
            onChange={e => setOnlySurvivors(e.target.checked)}
          />
          残りの人だけ表示
        </label>
      </div>
      <VoteMatrixInput
        title="決選投票"
        participants={displayParticipants}
        matrixInput={runoffMatrix}
        setMatrixInput={setRunoffMatrixTracked}
        day={day}
        voteOrderInput={{}}
        setVoteOrderInput={() => {}}
      />
      {!showRunoff2 ? (
        <button
          type="button" className="secondary"
          style={{ fontSize: 12, marginTop: 8 }}
          onClick={() => setShowRunoff2(true)}
        >
          ＋ 2回目決選投票を追加
        </button>
      ) : (
        <>
          <hr style={{ margin: '12px 0' }} />
          <VoteMatrixInput
            title="2回目決選投票"
            participants={displayParticipants}
            matrixInput={runoff2Matrix}
            setMatrixInput={setRunoff2MatrixTracked}
            day={day}
            voteOrderInput={{}}
            setVoteOrderInput={() => {}}
          />
        </>
      )}
    </div>
  )
})
 
export default RunoffVoteSection

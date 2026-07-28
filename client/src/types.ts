// プレイヤー
export type Player = {
  id: number
  name: string
}

// 役職
export type Role = {
  id: number
  name: string
  team: 'village' | 'wolf' | 'other'
  needs_co: boolean
}

// 試合
export type Game = {
  id: number
  played_at: string | null
  result: 'village_win' | 'wolf_win' | 'other' | null
  notes: string | null
}

// 試合参加者（JOINした結果）
export type Participant = {
  id: number
  game_id: number
  player_id: number
  role_id: number
  survived: boolean
  participant_number: number | null
  player_name: string
  role_name: string
  team: 'village' | 'wolf' | 'other'
}

// 投票
export type Vote = {
  id: number
  game_id: number
  voter_id: number
  target_id: number
  day_number: number
  vote_type: 'normal' | 'runoff'
  vote_order: number | null
  receive_order: number | null
}

// 吊り
export type Execution = {
  id: number
  game_id: number
  day_number: number
  participant_id: number | null
  execution_type: 'normal' | 'random' | 'runoff_execution' | 'none'
}

// 夜怪
export type NightKill = {
  id: number
  game_id: number
  day_number: number
  participant_id: number | null
}

// CO
export type CoEvent = {
  id: number
  game_id: number
  participant_id: number
  claimed_role_id: number
  co_day: number | null
  player_name: string
  claimed_role_name: string
}

// 占い結果
export type SeerResult = {
  id: number
  game_id: number
  seer_participant_id: number
  target_participant_id: number
  day_number: number
  result: 'white' | 'black'
  disclosed_day: number | null
}

// 霊能結果
export type MediumResult = {
  id: number
  game_id: number
  medium_participant_id: number
  target_participant_id: number
  day_number: number
  result: 'white' | 'black'
  disclosed_day: number | null
}

// 騎士守り
export type KnightGuard = {
  id: number
  game_id: number
  knight_participant_id: number
  target_participant_id: number | null
  day_number: number
  is_gj: boolean
  disclosed_day: number | null
  knight_name: string
  target_name: string | null
}

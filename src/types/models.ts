export type Id = number

export interface Profile {
  id?: Id
  name: string
  nickname: string
  bio: string
  createdAt: Date
  updatedAt: Date
}

export interface Todo {
  id?: Id
  title: string
  date: string
  completed: boolean
  completedAt?: Date
  rewardGrantedAt?: Date
  createdAt: Date
}

export type AbilityName = 'intelligence' | 'fitness' | 'willpower' | 'charisma' | 'creativity'
export type AbilityAllocation = Record<AbilityName, number>
export type HabitLevel = 'mini' | 'plus' | 'elite'

export interface HabitLevelSetting {
  condition: string
  allocation: AbilityAllocation
}

export interface Habit {
  id?: Id
  name: string
  color: string
  periodKey?: string
  activeFrom?: string
  activeTo?: string
  isActive?: boolean
  mini?: HabitLevelSetting
  plus?: HabitLevelSetting
  elite?: HabitLevelSetting
  createdAt: Date
  updatedAt?: Date
}

export interface HabitCheckin {
  id?: Id
  habitId: Id
  date: string
  periodKey?: string
  level?: HabitLevel
  habitNameSnapshot?: string
  levelSnapshot?: HabitLevelSetting
  isMakeup?: boolean
  replacedAt?: Date
  createdAt: Date
  updatedAt?: Date
}

export type HabitTransactionSource = 'habit-checkin' | 'elite-achievement'

export interface HabitTransaction {
  id?: Id
  sourceType: HabitTransactionSource
  sourceId: string
  periodKey: string
  habitId?: Id
  experienceDelta: number
  currencyDelta: number
  abilityDelta: AbilityAllocation
  createdAt: Date
  reversedAt?: Date
  reversalOf?: Id
  reason: string
  futureActionKind?: 'ai-growth'
}

export interface AchievementState {
  id?: Id
  periodKey: string
  achievementKey: string
  earnedAt: Date
  invalidatedAt?: Date
}

export type WalletTransactionType = 'experience' | 'currency'

export interface WalletTransaction {
  id?: Id
  type: WalletTransactionType
  amount: number
  reason: string
  createdAt: Date
}

export type RewardStatus = 'available' | 'pending' | 'completed'

export interface Reward {
  id?: Id
  name: string
  cost: number
  status: RewardStatus
  createdAt: Date
}

export interface Setting {
  key: string
  value: string
  updatedAt: Date
}

export interface WalletSummary {
  experience: number
  currency: number
  level: number
  experienceIntoLevel: number
}

export interface AbilitySummary {
  raw: AbilityAllocation
  percentages: AbilityAllocation
  total: number
}

export interface PeriodStats {
  periodKey: string
  label: string
  completionRate: number
  eliteCount: number
  perfectAttendance: boolean
}

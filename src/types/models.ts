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

export interface Habit {
  id?: Id
  name: string
  color: string
  createdAt: Date
}

export interface HabitCheckin {
  id?: Id
  habitId: Id
  date: string
  createdAt: Date
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

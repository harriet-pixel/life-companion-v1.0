import Dexie, { type EntityTable } from 'dexie'
import type { AchievementState, Habit, HabitCheckin, HabitTransaction, Profile, Reward, Setting, Todo, WalletTransaction } from '../types/models'

export const db = new Dexie('life-companion') as Dexie & {
  profile: EntityTable<Profile, 'id'>
  todos: EntityTable<Todo, 'id'>
  habits: EntityTable<Habit, 'id'>
  habitCheckins: EntityTable<HabitCheckin, 'id'>
  habitTransactions: EntityTable<HabitTransaction, 'id'>
  achievementStates: EntityTable<AchievementState, 'id'>
  walletTransactions: EntityTable<WalletTransaction, 'id'>
  rewards: EntityTable<Reward, 'id'>
  settings: EntityTable<Setting, 'key'>
}

db.version(1).stores({
  profile: '++id, updatedAt',
  todos: '++id, date, completed, createdAt',
  habits: '++id, createdAt',
  habitCheckins: '++id, habitId, date, [habitId+date]',
  walletTransactions: '++id, type, createdAt',
  rewards: '++id, status, createdAt',
  settings: 'key, updatedAt',
})

db.version(2).stores({
  profile: '++id, updatedAt',
  todos: '++id, date, completed, createdAt',
  habits: '++id, periodKey, activeFrom, isActive, createdAt',
  habitCheckins: '++id, habitId, date, periodKey, [habitId+date]',
  habitTransactions: '++id, sourceType, sourceId, periodKey, habitId, reversedAt, [sourceType+sourceId]',
  achievementStates: '++id, periodKey, achievementKey, [periodKey+achievementKey]',
  walletTransactions: '++id, type, createdAt',
  rewards: '++id, status, createdAt',
  settings: 'key, updatedAt',
}).upgrade(async transaction => {
  const settings = transaction.table('settings')
  const reset = await settings.get('habit-system-reset-v1')
  if (!reset) {
    await transaction.table('walletTransactions').clear()
    await settings.put({ key: 'habit-system-reset-v1', value: 'true', updatedAt: new Date() })
  }
})

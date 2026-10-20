import Dexie, { type EntityTable } from 'dexie'
import type { Habit, HabitCheckin, Profile, Reward, Setting, Todo, WalletTransaction } from '../types/models'

export const db = new Dexie('life-companion') as Dexie & {
  profile: EntityTable<Profile, 'id'>
  todos: EntityTable<Todo, 'id'>
  habits: EntityTable<Habit, 'id'>
  habitCheckins: EntityTable<HabitCheckin, 'id'>
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

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

const version2Schema = {
  profile: '++id, updatedAt',
  todos: '++id, date, completed, createdAt',
  habits: '++id, periodKey, activeFrom, isActive, createdAt',
  habitCheckins: '++id, habitId, date, periodKey, [habitId+date]',
  habitTransactions: '++id, sourceType, sourceId, periodKey, habitId, reversedAt, [sourceType+sourceId]',
  achievementStates: '++id, periodKey, achievementKey, [periodKey+achievementKey]',
  walletTransactions: '++id, type, createdAt',
  rewards: '++id, status, createdAt',
  settings: 'key, updatedAt',
}

// Schema upgrades must not reset user data. v3 also upgrades databases that reached
// the earlier v2 release, whose upgrade hook attempted application work.
db.version(2).stores(version2Schema)
db.version(3).stores(version2Schema)
db.version(4).stores({
  ...version2Schema,
  profile: '++id, createdAt, updatedAt',
})

export async function openDatabase() {
  await db.open()
  return db
}

export async function ensureHabitSystemReset() {
  await db.transaction('rw', db.settings, db.walletTransactions, () => db.settings.get('habit-system-reset-v1').then(reset => {
    if (reset) return undefined
    return db.walletTransactions.clear().then(() => db.settings.put({ key: 'habit-system-reset-v1', value: 'true', updatedAt: new Date() }))
  }))
}

export async function rebuildLocalDatabase() {
  db.close()
  await Dexie.delete(db.name)
  await db.open()
}

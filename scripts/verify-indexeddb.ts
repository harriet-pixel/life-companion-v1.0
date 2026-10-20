import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { db, ensureHabitSystemReset, openDatabase } from '../src/db/database.ts'

async function removeDatabase() {
  db.close()
  await Dexie.delete('life-companion')
}

async function checkBlankDatabase() {
  await removeDatabase()
  await openDatabase()
  await ensureHabitSystemReset()
  if (!await db.settings.get('habit-system-reset-v1')) throw new Error('空白資料庫未寫入 reset 旗標')
  db.close()
}

async function checkV1Upgrade() {
  await removeDatabase()
  const legacy = new Dexie('life-companion')
  legacy.version(1).stores({
    profile: '++id, updatedAt',
    todos: '++id, date, completed, createdAt',
    habits: '++id, createdAt',
    habitCheckins: '++id, habitId, date, [habitId+date]',
    walletTransactions: '++id, type, createdAt',
    rewards: '++id, status, createdAt',
    settings: 'key, updatedAt',
  })
  await legacy.open()
  await legacy.table('walletTransactions').add({ type: 'experience', amount: 99, reason: '舊資料', createdAt: new Date() })
  await legacy.table('profile').add({ name: '保留', nickname: '我', bio: '', createdAt: new Date(), updatedAt: new Date() })
  legacy.close()
  await openDatabase()
  await ensureHabitSystemReset()
  if (await db.walletTransactions.count()) throw new Error('v1 升級未清空一次性 walletTransactions')
  if (!await db.settings.get('habit-system-reset-v1')) throw new Error('v1 升級未記錄 reset 旗標')
  if (!await db.profile.count()) throw new Error('v1 升級錯誤刪除了 profile')
  db.close()
}

async function checkFailedV2State() {
  await removeDatabase()
  const v2 = new Dexie('life-companion')
  v2.version(2).stores({
    profile: '++id, updatedAt',
    todos: '++id, date, completed, createdAt',
    habits: '++id, periodKey, activeFrom, isActive, createdAt',
    habitCheckins: '++id, habitId, date, periodKey, [habitId+date]',
    habitTransactions: '++id, sourceType, sourceId, periodKey, habitId, reversedAt, [sourceType+sourceId]',
    achievementStates: '++id, periodKey, achievementKey, [periodKey+achievementKey]',
    walletTransactions: '++id, type, createdAt',
    rewards: '++id, status, createdAt',
    settings: 'key, updatedAt',
  })
  await v2.open()
  await v2.table('walletTransactions').add({ type: 'experience', amount: 12, reason: '未完成 reset', createdAt: new Date() })
  v2.close()
  await openDatabase()
  await ensureHabitSystemReset()
  if (await db.walletTransactions.count()) throw new Error('舊 v2 狀態未完成正常 reset')
  if (!await db.settings.get('habit-system-reset-v1')) throw new Error('舊 v2 狀態未補寫 reset 旗標')
  db.close()
}

async function checkCompletedReset() {
  await openDatabase()
  await db.walletTransactions.add({ type: 'currency', amount: 7, reason: '新流水', createdAt: new Date() })
  await ensureHabitSystemReset()
  if (await db.walletTransactions.count() !== 1) throw new Error('已完成 reset 的資料庫被重複清除')
  db.close()
}

await checkBlankDatabase()
await checkV1Upgrade()
await checkFailedV2State()
await checkCompletedReset()
console.log('IndexedDB blank, v1 upgrade, failed v2 state, and completed reset checks passed.')

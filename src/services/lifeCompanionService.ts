import { db, ensureHabitSystemReset } from '../db/database'
import type { Profile, Todo, WalletSummary } from '../types/models'

const SEED_KEY = 'seeded-v1'
const today = () => new Date().toISOString().slice(0, 10)

export async function initializeData() {
  await ensureHabitSystemReset()
  const now = new Date()
  await db.transaction('rw', db.profile, db.todos, db.rewards, db.settings, async () => {
    const seeded = await db.settings.get(SEED_KEY)
    if (seeded) return
    await db.profile.add({ name: '親愛的你', nickname: '你', bio: '這是一個只屬於你的陪伴角落。', createdAt: now, updatedAt: now })
    await db.todos.bulkAdd([
      { title: '喝一杯水，照顧身體', date: today(), completed: false, createdAt: now },
      { title: '完成最重要的一件事', date: today(), completed: false, createdAt: now },
      { title: '留 10 分鐘給自己', date: today(), completed: false, createdAt: now },
    ])
    await db.rewards.bulkAdd([
      { name: '一杯喜歡的飲料', cost: 80, status: 'available', createdAt: now },
      { name: '一段完全放空的時光', cost: 150, status: 'available', createdAt: now },
    ])
    await db.settings.put({ key: SEED_KEY, value: 'true', updatedAt: now })
  })
}

export async function getProfile() { return db.profile.orderBy('createdAt').first() }
export async function saveProfile(input: Pick<Profile, 'name' | 'nickname' | 'bio'>) {
  const current = await getProfile()
  const now = new Date()
  if (current?.id) return db.profile.update(current.id, { ...input, updatedAt: now })
  return db.profile.add({ ...input, createdAt: now, updatedAt: now })
}

export async function listTodos() { return db.todos.orderBy('createdAt').reverse().toArray() }
export async function addTodo(title: string, date = today()) {
  const trimmed = title.trim()
  if (!trimmed) return
  await db.todos.add({ title: trimmed, date, completed: false, createdAt: new Date() })
}
export async function deleteTodo(id: number) { await db.todos.delete(id) }

export async function setTodoCompleted(todo: Todo, completed: boolean) {
  if (!todo.id || todo.completed === completed) return
  const now = new Date()
  await db.transaction('rw', db.todos, db.walletTransactions, async () => {
    const current = await db.todos.get(todo.id!)
    if (!current || current.completed === completed) return
    if (completed && !current.rewardGrantedAt) {
      const reason = '完成待辦：' + current.title
      await db.walletTransactions.bulkAdd([
        { type: 'experience', amount: 10, reason, createdAt: now },
        { type: 'currency', amount: 5, reason, createdAt: now },
      ])
      await db.todos.update(current.id!, { completed: true, completedAt: now, rewardGrantedAt: now })
      return
    }
    await db.todos.update(current.id!, { completed, completedAt: completed ? now : undefined })
  })
}

export async function getWalletSummary(): Promise<WalletSummary> {
  const [transactions, habitTransactions] = await Promise.all([db.walletTransactions.toArray(), db.habitTransactions.toArray()])
  const experience = transactions.filter(item => item.type === 'experience').reduce((total, item) => total + item.amount, 0) + habitTransactions.filter(item => !item.reversedAt).reduce((total, item) => total + item.experienceDelta, 0)
  const currency = transactions.filter(item => item.type === 'currency').reduce((total, item) => total + item.amount, 0) + habitTransactions.filter(item => !item.reversedAt).reduce((total, item) => total + item.currencyDelta, 0)
  return { experience, currency, level: Math.floor(experience / 100) + 1, experienceIntoLevel: experience % 100 }
}

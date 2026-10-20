import { db } from '../db/database'
import type { AbilityAllocation, AbilityName, AbilitySummary, Habit, HabitCheckin, HabitLevel, HabitTransaction, PeriodStats } from '../types/models'

const abilities: AbilityName[] = ['intelligence', 'fitness', 'willpower', 'charisma', 'creativity']
const pointsFor: Record<HabitLevel, number> = { mini: 1, plus: 2, elite: 3 }
const emptyAllocation = (): AbilityAllocation => ({ intelligence: 0, fitness: 0, willpower: 0, charisma: 0, creativity: 0 })
const dateString = (value = new Date()) => value.toISOString().slice(0, 10)

export const periodForDate = (date: string) => {
  const [year, month, day] = date.split('-').map(Number)
  return year + '-' + String(month).padStart(2, '0') + '-' + (day <= 15 ? 'A' : 'B')
}

export const periodDays = (periodKey: string) => {
  const [year, month, half] = periodKey.split(/[-]/)
  const start = half === 'A' ? 1 : 16
  const end = half === 'A' ? 15 : 30
  return Array.from({ length: end - start + 1 }, (_, index) => year + '-' + month + '-' + String(start + index).padStart(2, '0'))
}

export const currentPeriodKey = () => periodForDate(dateString())
export const allocationTotal = (allocation: AbilityAllocation) => abilities.reduce((total, ability) => total + (allocation[ability] || 0), 0)
const settingFor = (habit: Habit, level: HabitLevel) => habit[level]

export function validateHabitInput(input: Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>) {
  if (!input.name.trim()) return '請輸入習慣名稱。'
  for (const level of Object.keys(pointsFor) as HabitLevel[]) {
    const setting = settingFor(input as Habit, level)
    if (!setting?.condition.trim()) return '請完整填寫 Mini、Plus、Elite 的文字條件。'
    if (allocationTotal(setting.allocation) !== pointsFor[level]) return level.toUpperCase() + ' 的能力分配總和必須等於 ' + pointsFor[level] + '。'
  }
  return undefined
}

function previousPeriod(periodKey: string) {
  const [yearText, monthText, half] = periodKey.split('-')
  let year = Number(yearText)
  let month = Number(monthText)
  if (half === 'B') return year + '-' + monthText + '-A'
  month -= 1
  if (month === 0) { month = 12; year -= 1 }
  return year + '-' + String(month).padStart(2, '0') + '-B'
}

export async function ensurePeriodHabits(periodKey: string) {
  await db.transaction('rw', db.habits, async () => {
    const existing = await db.habits.where('periodKey').equals(periodKey).count()
    if (existing) return
    const prior = await db.habits.where('periodKey').equals(previousPeriod(periodKey)).toArray()
    const now = new Date()
    const firstDay = periodDays(periodKey)[0]
    const clones = prior.filter(habit => habit.isActive !== false).slice(0, 3).map(habit => ({
      name: habit.name, color: habit.color, periodKey, activeFrom: firstDay, isActive: true,
      mini: habit.mini, plus: habit.plus, elite: habit.elite, createdAt: now, updatedAt: now,
    }))
    if (clones.length) await db.habits.bulkAdd(clones)
  })
}

export async function listHabitPeriod(periodKey: string) {
  await ensurePeriodHabits(periodKey)
  const [habits, checkins, achievements, makeup] = await Promise.all([
    db.habits.where('periodKey').equals(periodKey).toArray(),
    db.habitCheckins.where('periodKey').equals(periodKey).toArray(),
    db.achievementStates.where('periodKey').equals(periodKey).toArray(),
    db.settings.get('makeup-' + periodKey.slice(0, 7)),
  ])
  return { habits: habits.sort((a, b) => (a.createdAt.getTime() - b.createdAt.getTime())), checkins, achievements: achievements.filter(item => !item.invalidatedAt), makeupUsed: !!makeup }
}

export async function applyMonthlyMakeup(habit: Habit, date: string, level: HabitLevel) {
  const periodKey = habit.periodKey || ''
  const [year, month] = periodKey.split('-').map(Number)
  const isThirtyFirstMonth = new Date(year, month, 0).getDate() === 31
  if (!isThirtyFirstMonth || !periodKey.endsWith('-B') || date.slice(-2) < '16' || date.slice(-2) > '30') throw new Error('補做只適用於 31 日月份的下期（16–30 日）。')
  const key = 'makeup-' + periodKey.slice(0, 7)
  const used = await db.settings.get(key)
  if (used) throw new Error('本月的補做機會已使用。')
  const existing = await db.habitCheckins.where('[habitId+date]').equals([habit.id!, date]).first()
  if (existing) throw new Error('此日已有打卡紀錄，不能補做。')
  await setHabitCheckin(habit, date, level, true)
  await db.settings.put({ key, value: 'true', updatedAt: new Date() })
}

export async function saveHabit(input: Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>, id?: number) {
  const error = validateHabitInput(input)
  if (error) throw new Error(error)
  await db.transaction('rw', db.habits, db.habitCheckins, db.habitTransactions, db.achievementStates, async () => {
    const now = new Date()
    if (id) {
      const current = await db.habits.get(id)
      if (!current) return
      await db.habits.update(id, { ...input, updatedAt: now })
      await reconcileAchievements(input.periodKey || current.periodKey || currentPeriodKey())
      return
    }
    const active = await db.habits.where('periodKey').equals(input.periodKey || '').filter(habit => habit.isActive !== false).count()
    if (active >= 3) throw new Error('每一期最多只能啟用 3 個彈性習慣。')
    await db.habits.add({ ...input, createdAt: now, updatedAt: now })
    await reconcileAchievements(input.periodKey || currentPeriodKey())
  })
}

export async function deactivateHabit(habit: Habit) {
  if (!habit.id) return
  await db.transaction('rw', db.habits, db.habitCheckins, db.habitTransactions, db.achievementStates, async () => {
    await db.habits.update(habit.id!, { isActive: false, activeTo: dateString(), updatedAt: new Date() })
    await reconcileAchievements(habit.periodKey || currentPeriodKey())
  })
}

function distribute(points: number, weights: AbilityAllocation): AbilityAllocation {
  const total = allocationTotal(weights)
  if (!total || !points) return emptyAllocation()
  const output = emptyAllocation()
  const fractions = abilities.map((ability, order) => {
    const exact = points * weights[ability] / total
    output[ability] = Math.floor(exact)
    return { ability, order, fraction: exact - Math.floor(exact) }
  })
  let remainder = points - allocationTotal(output)
  fractions.sort((a, b) => b.fraction - a.fraction || a.order - b.order)
  for (let index = 0; index < remainder; index += 1) output[fractions[index].ability] += 1
  return output
}

function addAllocations(target: AbilityAllocation, source: AbilityAllocation) {
  for (const ability of abilities) target[ability] += source[ability] || 0
}

function negate(allocation: AbilityAllocation): AbilityAllocation {
  const output = emptyAllocation()
  for (const ability of abilities) output[ability] = -allocation[ability]
  return output
}

async function reverseTransaction(transaction: HabitTransaction, now: Date) {
  if (!transaction.id || transaction.reversedAt) return
  await db.habitTransactions.update(transaction.id, { reversedAt: now })
  await db.habitTransactions.add({
    sourceType: transaction.sourceType,
    sourceId: 'reversal:' + transaction.id,
    periodKey: transaction.periodKey,
    habitId: transaction.habitId,
    experienceDelta: -transaction.experienceDelta,
    currencyDelta: -transaction.currencyDelta,
    abilityDelta: negate(transaction.abilityDelta),
    createdAt: now,
    reversalOf: transaction.id,
    reason: '撤回：' + transaction.reason,
  })
}

async function activeSource(sourceType: HabitTransaction['sourceType'], sourceId: string) {
  const transactions = await db.habitTransactions.where('[sourceType+sourceId]').equals([sourceType, sourceId]).toArray()
  return transactions.find(item => !item.reversedAt)
}

async function writeCredit(transaction: Omit<HabitTransaction, 'id' | 'createdAt' | 'reversedAt'>) {
  const existing = await activeSource(transaction.sourceType, transaction.sourceId)
  if (existing) return
  await db.habitTransactions.add({ ...transaction, createdAt: new Date() })
}

export async function setHabitCheckin(habit: Habit, date: string, level: HabitLevel, isMakeup = false) {
  if (!habit.id || !habit.periodKey || !habit.activeFrom || date < habit.activeFrom || (habit.activeTo && date > habit.activeTo)) throw new Error('這一天不在此習慣的啟用期間。')
  const habitId = habit.id
  const periodKey = periodForDate(date)
  if (periodKey !== habit.periodKey) throw new Error('請在對應期別進行打卡。')
  await db.transaction('rw', db.habitCheckins, db.habitTransactions, db.habits, db.achievementStates, async () => {
    const now = new Date()
    const existing = await db.habitCheckins.where('[habitId+date]').equals([habitId, date]).first()
    if (existing?.id) {
      const prior = await activeSource('habit-checkin', String(existing.id))
      if (prior) await reverseTransaction(prior, now)
      await db.habitCheckins.update(existing.id, { level, habitNameSnapshot: habit.name, levelSnapshot: settingFor(habit, level), isMakeup, updatedAt: now })
      await writeCredit({ sourceType: 'habit-checkin', sourceId: String(existing.id), periodKey, habitId, experienceDelta: pointsFor[level], currencyDelta: pointsFor[level], abilityDelta: settingFor(habit, level)!.allocation, reason: habit.name + ' ' + level.toUpperCase() + ' 打卡' })
    } else {
      const id = await db.habitCheckins.add({ habitId, date, periodKey, level, habitNameSnapshot: habit.name, levelSnapshot: settingFor(habit, level), isMakeup, createdAt: now, updatedAt: now })
      await writeCredit({ sourceType: 'habit-checkin', sourceId: String(id), periodKey, habitId, experienceDelta: pointsFor[level], currencyDelta: pointsFor[level], abilityDelta: settingFor(habit, level)!.allocation, reason: habit.name + ' ' + level.toUpperCase() + ' 打卡' })
    }
    if (!isMakeup) await reconcileAchievements(periodKey)
  })
}

export async function undoLatestCheckin(periodKey: string) {
  await db.transaction('rw', db.habitCheckins, db.habitTransactions, db.habits, db.achievementStates, async () => {
    const checkins = await db.habitCheckins.where('periodKey').equals(periodKey).toArray()
    const latest = checkins.sort((a, b) => (b.updatedAt || b.createdAt).getTime() - (a.updatedAt || a.createdAt).getTime())[0]
    if (!latest?.id) return
    const credit = await activeSource('habit-checkin', String(latest.id))
    if (credit) await reverseTransaction(credit, new Date())
    await db.habitCheckins.delete(latest.id)
    await reconcileAchievements(periodKey)
  })
}

type AchievementTarget = { sourceId: string; points: number; allocation: AbilityAllocation; reason: string; habitId?: number }

function activeOn(habit: Habit, date: string) {
  return habit.isActive !== false && !!habit.activeFrom && habit.activeFrom <= date && (!habit.activeTo || habit.activeTo >= date)
}

function periodEliteWeights(checkins: HabitCheckin[]) {
  const weights = emptyAllocation()
  for (const checkin of checkins.filter(item => item.level === 'elite')) addAllocations(weights, checkin.levelSnapshot?.allocation || emptyAllocation())
  return weights
}

async function reconcileAchievements(periodKey: string) {
  const [habits, checkins] = await Promise.all([
    db.habits.where('periodKey').equals(periodKey).toArray(),
    db.habitCheckins.where('periodKey').equals(periodKey).toArray(),
  ])
  const targets: AchievementTarget[] = []
  const eligibleCheckins = checkins.filter(item => !item.isMakeup)
  const elite = eligibleCheckins.filter(item => item.level === 'elite')
  const crossWeights = periodEliteWeights(eligibleCheckins)

  for (const habit of habits) {
    if (!habit.id) continue
    const dates = elite.filter(item => item.habitId === habit.id).map(item => item.date).sort()
    const snapshot = elite.find(item => item.habitId === habit.id)?.levelSnapshot?.allocation || habit.elite?.allocation || emptyAllocation()
    for (const [needed, points] of [[2, 1], [3, 3], [7, 5]] as const) {
      let run = 0
      let hit = false
      for (const day of periodDays(periodKey)) {
        if (dates.includes(day)) { run += 1; if (run >= needed) hit = true } else run = 0
      }
      if (hit) targets.push({ sourceId: 'streak-' + needed + '-' + habit.id, points, allocation: distribute(points, snapshot), reason: habit.name + ' 連續 ' + needed + ' 天 Elite', habitId: habit.id })
    }
    if (dates.length >= 10) targets.push({ sourceId: 'elite-10-' + habit.id, points: 3, allocation: distribute(3, snapshot), reason: habit.name + ' 本期 10 次 Elite', habitId: habit.id })
  }

  if (elite.length >= 15) targets.push({ sourceId: 'period-elite-15', points: 3, allocation: distribute(3, crossWeights), reason: '本期累積 15 次 Elite' })

  const allEliteDay = periodDays(periodKey).some(day => {
    const active = habits.filter(habit => activeOn(habit, day))
    return active.length === 3 && active.every(habit => elite.some(checkin => checkin.habitId === habit.id && checkin.date === day))
  })
  if (allEliteDay) targets.push({ sourceId: 'three-elite-day', points: 2, allocation: distribute(2, crossWeights), reason: '同一天三個習慣皆 Elite' })

  const attendance = periodDays(periodKey).every(day => {
    const active = habits.filter(habit => activeOn(habit, day))
    return active.length > 0 && active.every(habit => eligibleCheckins.some(checkin => checkin.habitId === habit.id && checkin.date === day))
  })
  if (attendance) targets.push({ sourceId: 'perfect-attendance', points: 20, allocation: distribute(20, crossWeights), reason: '本期全勤' })

  const activeTransactions = (await db.habitTransactions.where('periodKey').equals(periodKey).toArray()).filter(item => item.sourceType === 'elite-achievement' && !item.reversedAt && !item.sourceId.startsWith('reversal:'))
  const desired = new Map(targets.map(target => [target.sourceId, target]))
  const now = new Date()
  for (const transaction of activeTransactions) {
    if (!desired.has(transaction.sourceId)) {
      await reverseTransaction(transaction, now)
      const state = await db.achievementStates.where('[periodKey+achievementKey]').equals([periodKey, transaction.sourceId]).first()
      if (state?.id) await db.achievementStates.update(state.id, { invalidatedAt: now })
    }
  }
  for (const target of targets) {
    const current = await activeSource('elite-achievement', target.sourceId)
    if (!current) {
      await writeCredit({ sourceType: 'elite-achievement', sourceId: target.sourceId, periodKey, habitId: target.habitId, experienceDelta: target.points, currencyDelta: target.points, abilityDelta: target.allocation, reason: target.reason })
      const state = await db.achievementStates.where('[periodKey+achievementKey]').equals([periodKey, target.sourceId]).first()
      if (state?.id) await db.achievementStates.update(state.id, { earnedAt: now, invalidatedAt: undefined })
      else await db.achievementStates.add({ periodKey, achievementKey: target.sourceId, earnedAt: now })
    }
  }
}

export async function getAbilitySummary(): Promise<AbilitySummary> {
  const raw = emptyAllocation()
  const transactions = await db.habitTransactions.toArray()
  for (const transaction of transactions.filter(item => !item.reversedAt)) addAllocations(raw, transaction.abilityDelta)
  const total = allocationTotal(raw)
  const percentages = emptyAllocation()
  if (total > 0) Object.assign(percentages, distribute(100, raw))
  return { raw, percentages, total }
}

export async function getPeriodStats(): Promise<PeriodStats[]> {
  const checkins = await db.habitCheckins.toArray()
  const habits = await db.habits.toArray()
  const keys = [...new Set([...checkins.map(item => item.periodKey), ...habits.map(item => item.periodKey)].filter((key): key is string => !!key))].sort().reverse()
  return keys.map(periodKey => {
    const days = periodDays(periodKey)
    const inPeriod = checkins.filter(item => item.periodKey === periodKey)
    const periodHabits = habits.filter(item => item.periodKey === periodKey)
    const expected = days.reduce((total, day) => total + periodHabits.filter(habit => activeOn(habit, day)).length, 0)
    const count = inPeriod.length
    const perfect = expected > 0 && count >= expected
    return { periodKey, label: periodKey.replace('-A', ' 上期').replace('-B', ' 下期'), completionRate: expected ? Math.round(count / expected * 100) : 0, eliteCount: inPeriod.filter(item => item.level === 'elite').length, perfectAttendance: perfect }
  })
}

import { useCallback, useEffect, useState } from 'react'
import { addTodo, deleteTodo, getProfile, getWalletSummary, initializeData, listTodos, saveProfile, setTodoCompleted } from '../services/lifeCompanionService'
import { db, ensureHabitSystemReset, openDatabase, rebuildLocalDatabase } from '../db/database'
import type { AbilitySummary, Habit, Profile, Reward, Todo, WalletSummary } from '../types/models'
import { applyMonthlyMakeup, currentPeriodKey, deactivateHabit, getAbilitySummary, getPeriodStats, listHabitPeriod, saveHabit, setHabitCheckin, undoLatestCheckin } from '../services/habitService'

const emptyWallet: WalletSummary = { experience: 0, currency: 0, level: 1, experienceIntoLevel: 0 }
export type DatabaseDiagnostic = { name: string; message: string; database: string; version: number; step: string }

function diagnosticFor(step: string, reason: unknown): DatabaseDiagnostic {
  const error = reason instanceof Error ? reason : new Error(String(reason))
  return { name: error.name || 'UnknownError', message: error.message || '未知錯誤', database: db.name, version: db.verno, step }
}

export function useLifeData() {
  const [profile, setProfile] = useState<Profile | undefined>()
  const [todos, setTodos] = useState<Todo[]>([])
  const [rewards, setRewards] = useState<Reward[]>([])
  const [wallet, setWallet] = useState<WalletSummary>(emptyWallet)
  const [ability, setAbility] = useState<AbilitySummary>({ raw: { intelligence: 0, fitness: 0, willpower: 0, charisma: 0, creativity: 0 }, percentages: { intelligence: 0, fitness: 0, willpower: 0, charisma: 0, creativity: 0 }, total: 0 })
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<DatabaseDiagnostic | undefined>()

  const refresh = useCallback(async () => {
    const [nextProfile, nextTodos, nextRewards, nextWallet, nextAbility] = await Promise.all([
      getProfile(), listTodos(), db.rewards.orderBy('createdAt').toArray(), getWalletSummary(),
      getAbilitySummary(),
    ])
    setProfile(nextProfile)
    setTodos(nextTodos)
    setRewards(nextRewards)
    setWallet(nextWallet)
    setAbility(nextAbility)
  }, [])

  const initialize = useCallback(async () => {
    setReady(false)
    setError(undefined)
    let step = 'open'
    try {
      await openDatabase()
      step = 'reset'
      await ensureHabitSystemReset()
      step = 'seed'
      await initializeData()
      step = 'refresh'
      await refresh()
    } catch (reason) {
      if (import.meta.env.DEV) console.error('Life Companion IndexedDB 初始化失敗', reason)
      setError(diagnosticFor(step, reason))
    } finally {
      setReady(true)
    }
  }, [refresh])

  useEffect(() => {
    void (async () => { await initialize() })()
  }, [initialize])

  const loadHabitPeriod = useCallback((periodKey = currentPeriodKey()) => listHabitPeriod(periodKey), [])
  const rebuild = useCallback(async () => {
    setReady(false)
    setError(undefined)
    try {
      await rebuildLocalDatabase()
      await initialize()
    } catch (reason) {
      if (import.meta.env.DEV) console.error('Life Companion IndexedDB 重建失敗', reason)
      setError(diagnosticFor('rebuild', reason))
      setReady(true)
    }
  }, [initialize])

  return {
    profile, todos, rewards, wallet, ability, ready, error, retry: initialize, rebuild,
    saveProfile: async (input: Pick<Profile, 'name' | 'nickname' | 'bio'>) => { await saveProfile(input); await refresh() },
    addTodo: async (title: string) => { await addTodo(title); await refresh() },
    deleteTodo: async (id: number) => { await deleteTodo(id); await refresh() },
    setTodoCompleted: async (todo: Todo, completed: boolean) => { await setTodoCompleted(todo, completed); await refresh() },
    loadHabitPeriod,
    saveHabit: async (habit: Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>, id?: number) => { await saveHabit(habit, id); await refresh() },
    deactivateHabit: async (habit: Habit) => { await deactivateHabit(habit); await refresh() },
    setHabitCheckin: async (habit: Habit, date: string, level: 'mini' | 'plus' | 'elite') => { await setHabitCheckin(habit, date, level); await refresh() },
    undoLatestCheckin: async (periodKey: string) => { await undoLatestCheckin(periodKey); await refresh() },
    applyMonthlyMakeup: async (habit: Habit, date: string, level: 'mini' | 'plus' | 'elite') => { await applyMonthlyMakeup(habit, date, level); await refresh() },
    getPeriodStats,
  }
}

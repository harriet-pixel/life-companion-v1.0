import { useCallback, useEffect, useState } from 'react'
import { addTodo, deleteTodo, getProfile, getWalletSummary, initializeData, listTodos, saveProfile, setTodoCompleted } from '../services/lifeCompanionService'
import { db } from '../db/database'
import type { AbilitySummary, Habit, Profile, Reward, Todo, WalletSummary } from '../types/models'
import { applyMonthlyMakeup, currentPeriodKey, deactivateHabit, getAbilitySummary, getPeriodStats, listHabitPeriod, saveHabit, setHabitCheckin, undoLatestCheckin } from '../services/habitService'

const emptyWallet: WalletSummary = { experience: 0, currency: 0, level: 1, experienceIntoLevel: 0 }

export function useLifeData() {
  const [profile, setProfile] = useState<Profile | undefined>()
  const [todos, setTodos] = useState<Todo[]>([])
  const [rewards, setRewards] = useState<Reward[]>([])
  const [wallet, setWallet] = useState<WalletSummary>(emptyWallet)
  const [ability, setAbility] = useState<AbilitySummary>({ raw: { intelligence: 0, fitness: 0, willpower: 0, charisma: 0, creativity: 0 }, percentages: { intelligence: 0, fitness: 0, willpower: 0, charisma: 0, creativity: 0 }, total: 0 })
  const [ready, setReady] = useState(false)

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

  useEffect(() => {
    void (async () => {
      await initializeData()
      await refresh()
      setReady(true)
    })()
  }, [refresh])

  const loadHabitPeriod = useCallback((periodKey = currentPeriodKey()) => listHabitPeriod(periodKey), [])

  return {
    profile, todos, rewards, wallet, ability, ready,
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

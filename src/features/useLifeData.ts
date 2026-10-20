import { useCallback, useEffect, useState } from 'react'
import { addTodo, deleteTodo, getProfile, getWalletSummary, initializeData, listTodos, saveProfile, setTodoCompleted } from '../services/lifeCompanionService'
import { db } from '../db/database'
import type { Profile, Reward, Todo, WalletSummary } from '../types/models'

const emptyWallet: WalletSummary = { experience: 0, currency: 0, level: 1, experienceIntoLevel: 0 }

export function useLifeData() {
  const [profile, setProfile] = useState<Profile | undefined>()
  const [todos, setTodos] = useState<Todo[]>([])
  const [rewards, setRewards] = useState<Reward[]>([])
  const [wallet, setWallet] = useState<WalletSummary>(emptyWallet)
  const [ready, setReady] = useState(false)

  const refresh = useCallback(async () => {
    const [nextProfile, nextTodos, nextRewards, nextWallet] = await Promise.all([
      getProfile(), listTodos(), db.rewards.orderBy('createdAt').toArray(), getWalletSummary(),
    ])
    setProfile(nextProfile)
    setTodos(nextTodos)
    setRewards(nextRewards)
    setWallet(nextWallet)
  }, [])

  useEffect(() => {
    void (async () => {
      await initializeData()
      await refresh()
      setReady(true)
    })()
  }, [refresh])

  return {
    profile, todos, rewards, wallet, ready,
    saveProfile: async (input: Pick<Profile, 'name' | 'nickname' | 'bio'>) => { await saveProfile(input); await refresh() },
    addTodo: async (title: string) => { await addTodo(title); await refresh() },
    deleteTodo: async (id: number) => { await deleteTodo(id); await refresh() },
    setTodoCompleted: async (todo: Todo, completed: boolean) => { await setTodoCompleted(todo, completed); await refresh() },
  }
}

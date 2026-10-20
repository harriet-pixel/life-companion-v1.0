import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { currentPeriodKey, periodDays } from '../services/habitService'
import type { AbilityAllocation, Habit, HabitCheckin, HabitLevel, PeriodStats } from '../types/models'

const names: Record<keyof AbilityAllocation, string> = { intelligence: '智力', fitness: '體力', willpower: '意志', charisma: '魅力', creativity: '創造力' }
const levels: HabitLevel[] = ['mini', 'plus', 'elite']
const levelName: Record<HabitLevel, string> = { mini: 'Mini', plus: 'Plus', elite: 'Elite' }
const target: Record<HabitLevel, number> = { mini: 1, plus: 2, elite: 3 }
const blank = (): AbilityAllocation => ({ intelligence: 0, fitness: 0, willpower: 0, charisma: 0, creativity: 0 })
const total = (value: AbilityAllocation) => Object.values(value).reduce((sum, item) => sum + item, 0)

type Props = {
  loadHabitPeriod: (period?: string) => Promise<{ habits: Habit[]; checkins: HabitCheckin[]; achievements: { achievementKey: string }[]; makeupUsed: boolean }>
  saveHabit: (habit: Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>, id?: number) => Promise<void>
  deactivateHabit: (habit: Habit) => Promise<void>
  setHabitCheckin: (habit: Habit, date: string, level: HabitLevel) => Promise<void>
  undoLatestCheckin: (period: string) => Promise<void>
  applyMonthlyMakeup: (habit: Habit, date: string, level: HabitLevel) => Promise<void>
  getPeriodStats: () => Promise<PeriodStats[]>
}

function freshHabit(periodKey: string): Omit<Habit, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    name: '', color: '#6d9d91', periodKey, activeFrom: periodDays(periodKey)[0], isActive: true,
    mini: { condition: '完成最小行動', allocation: { ...blank(), intelligence: 1 } },
    plus: { condition: '完成進階行動', allocation: { ...blank(), intelligence: 1, fitness: 1 } },
    elite: { condition: '完成挑戰行動', allocation: { ...blank(), intelligence: 1, fitness: 1, willpower: 1 } },
  }
}

export function HabitPage({ loadHabitPeriod, saveHabit, deactivateHabit, setHabitCheckin, undoLatestCheckin, applyMonthlyMakeup, getPeriodStats }: Props) {
  const [period, setPeriod] = useState(currentPeriodKey())
  const [habits, setHabits] = useState<Habit[]>([])
  const [checkins, setCheckins] = useState<HabitCheckin[]>([])
  const [achievements, setAchievements] = useState<{ achievementKey: string }[]>([])
  const [makeupUsed, setMakeupUsed] = useState(false)
  const [makeupLevel, setMakeupLevel] = useState<HabitLevel>('mini')
  const [stats, setStats] = useState<PeriodStats[]>([])
  const [editing, setEditing] = useState<Habit | undefined>()
  const [showForm, setShowForm] = useState(false)
  const refresh = async () => {
    const next = await loadHabitPeriod(period)
    setHabits(next.habits)
    setCheckins(next.checkins)
    setAchievements(next.achievements)
    setMakeupUsed(next.makeupUsed)
    setStats(await getPeriodStats())
  }
  useEffect(() => {
    void (async () => {
      const next = await loadHabitPeriod(period)
      setHabits(next.habits)
      setCheckins(next.checkins)
      setAchievements(next.achievements)
      setMakeupUsed(next.makeupUsed)
      setStats(await getPeriodStats())
    })()
  }, [period, loadHabitPeriod, getPeriodStats])
  const days = useMemo(() => periodDays(period), [period])
  const active = habits.filter(item => item.isActive !== false)
  const eliteCount = checkins.filter(item => item.level === 'elite').length
  const checkinFor = (habitId: number | undefined, date: string) => checkins.find(item => item.habitId === habitId && item.date === date)
  const changePeriod = (half: 'A' | 'B') => setPeriod(period.slice(0, -1) + half)
  const applyLevel = async (habit: Habit, date: string, level: HabitLevel) => { await setHabitCheckin(habit, date, level); await refresh() }
  const canMakeup = period.endsWith('-B') && new Date(Number(period.slice(0, 4)), Number(period.slice(5, 7)), 0).getDate() === 31
  const applyMakeup = async () => {
    const missing = [...days].reverse().flatMap(date => active.filter(habit => habit.activeFrom && habit.activeFrom <= date && (!habit.activeTo || habit.activeTo >= date) && !checkinFor(habit.id, date)).map(habit => ({ habit, date })))[0]
    if (!missing) return
    await applyMonthlyMakeup(missing.habit, missing.date, makeupLevel)
    await refresh()
  }

  return <div className="page-stack habit-page">
    <section className="card page-hero"><p className="eyebrow">FLEXIBLE HABITS</p><h2>打卡習慣</h2><p>每期最多三個習慣；Mini、Plus、Elite 依你的實際完成程度記錄。</p></section>
    <section className="habit-toolbar card"><div><strong>{period.slice(0, 7)} 月</strong><p>本期 Elite：{eliteCount} 次 ・ 已解鎖 {achievements.length} 項成就</p></div><div className="period-switch"><button className={period.endsWith('A') ? 'active' : ''} onClick={() => changePeriod('A')}>1–15 日</button><button className={period.endsWith('B') ? 'active' : ''} onClick={() => changePeriod('B')}>16–30 日</button></div></section>
    <section className="habit-actions"><button className="primary compact" disabled={active.length >= 3} onClick={() => { setEditing(undefined); setShowForm(true) }}>＋ 新增習慣（{active.length}/3）</button><button className="soft-button" onClick={() => void undoLatestCheckin(period).then(refresh)}>↶ 撤回最近打卡</button></section>
    {canMakeup && <section className="card makeup-card"><strong>31 日補做機會</strong><p>{makeupUsed ? '本月補做已使用。' : '可補做下期最近一筆遺漏的既有習慣，限一次。'}</p><select value={makeupLevel} onChange={event => setMakeupLevel(event.target.value as HabitLevel)} disabled={makeupUsed}><option value="mini">Mini</option><option value="plus">Plus</option><option value="elite">Elite</option></select><button className="soft-button" disabled={makeupUsed} onClick={() => void applyMakeup()}>使用補做</button></section>}
    {showForm && <HabitForm period={period} initial={editing} onCancel={() => setShowForm(false)} onSave={async (habit, id) => { await saveHabit(habit, id); setShowForm(false); await refresh() }} />}
    <section className="habit-summary-grid">{active.map(habit => <article className="card habit-summary" key={habit.id}><div><span className="habit-dot" style={{ background: habit.color }} /><strong>{habit.name}</strong></div><p>Mini：{habit.mini?.condition}</p><p>Plus：{habit.plus?.condition}</p><p>Elite：{habit.elite?.condition}</p><div><button className="text-button" onClick={() => { setEditing(habit); setShowForm(true) }}>編輯設定</button><button className="text-button danger-link" onClick={() => void deactivateHabit(habit).then(refresh)}>停用</button></div></article>)}</section>
    <section className="card unlocked-card"><h3>本期已解鎖成就</h3>{achievements.length ? <ul>{achievements.map(item => <li key={item.achievementKey}>{achievementLabel(item.achievementKey)}</li>)}</ul> : <p className="empty-list">尚未解鎖成就，Elite 打卡會累積進度。</p>}</section>
    <section className="card checkin-list"><div className="section-title"><div><p className="eyebrow">CHECK IN</p><h3>{period.endsWith('A') ? '上期' : '下期'}每日打卡</h3></div></div>{days.map(date => <article className="day-card" key={date}><strong>{date.slice(5).replace('-', '/')}</strong><div>{active.length ? active.filter(habit => habit.activeFrom && habit.activeFrom <= date && (!habit.activeTo || habit.activeTo >= date)).map(habit => { const record = checkinFor(habit.id, date); return <div className="habit-check-row" key={habit.id}><span><i className="habit-dot" style={{ background: habit.color }} />{habit.name}</span><div className="level-buttons">{levels.map(level => <button key={level} className={record?.level === level ? 'selected ' + level : ''} onClick={() => void applyLevel(habit, date, level)}>{levelName[level]}</button>)}</div></div> }) : <p className="empty-list">此日尚無啟用習慣。</p>}</div></article>)}</section>
    <section className="card history-card"><div className="section-title"><h3>月／年達成比較</h3></div><div className="history-scroll">{stats.length ? stats.map(stat => <div className="history-row" key={stat.periodKey}><strong>{stat.label}</strong><span>完成率 {stat.completionRate}%</span><span>Elite {stat.eliteCount}</span><span>{stat.perfectAttendance ? '全勤' : '未全勤'}</span></div>) : <p className="empty-list">尚無歷史資料。</p>}</div></section>
  </div>
}

function achievementLabel(key: string) {
  if (key.startsWith('streak-')) return 'Elite 連續打卡成就'
  if (key.startsWith('elite-10')) return '單一習慣 10 次 Elite'
  if (key === 'period-elite-15') return '本期累積 15 次 Elite'
  if (key === 'three-elite-day') return '同日三個習慣皆 Elite'
  return '本期全勤'
}

function HabitForm({ period, initial, onCancel, onSave }: { period: string; initial?: Habit; onCancel: () => void; onSave: (habit: Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>, id?: number) => Promise<void> }) {
  const [form, setForm] = useState<Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>>(initial ? { name: initial.name, color: initial.color, periodKey: initial.periodKey, activeFrom: initial.activeFrom, activeTo: initial.activeTo, isActive: initial.isActive, mini: initial.mini, plus: initial.plus, elite: initial.elite } : freshHabit(period))
  const [error, setError] = useState('')
  const updateAllocation = (level: HabitLevel, ability: keyof AbilityAllocation, value: number) => {
    const setting = form[level]!
    setForm({ ...form, [level]: { ...setting, allocation: { ...setting.allocation, [ability]: Math.max(0, Math.min(3, value || 0)) } } })
  }
  const submit = (event: FormEvent) => { event.preventDefault(); for (const level of levels) if (total(form[level]!.allocation) !== target[level]) { setError(levelName[level] + ' 能力分配必須剛好等於 ' + target[level]); return } void onSave(form, initial?.id).catch(reason => setError(reason.message)) }
  return <form className="card habit-form" onSubmit={submit}><div className="section-title"><h3>{initial ? '修改習慣' : '新增習慣'}</h3><button type="button" className="text-button" onClick={onCancel}>關閉</button></div><label>習慣名稱<input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="例如：閱讀 20 分鐘" required /></label><label>代表色<input type="color" value={form.color} onChange={event => setForm({ ...form, color: event.target.value })} /></label>{levels.map(level => <fieldset key={level}><legend>{levelName[level]}（能力點合計 {target[level]}）</legend><label>文字條件<input value={form[level]!.condition} onChange={event => setForm({ ...form, [level]: { ...form[level]!, condition: event.target.value } })} required /></label><div className="allocation-grid">{(Object.keys(names) as (keyof AbilityAllocation)[]).map(ability => <label key={ability}>{names[ability]}<input type="number" min="0" max="3" value={form[level]!.allocation[ability]} onChange={event => updateAllocation(level, ability, Number(event.target.value))} /></label>)}</div><small className={total(form[level]!.allocation) === target[level] ? 'valid' : 'invalid'}>目前合計：{total(form[level]!.allocation)} / {target[level]}</small></fieldset>)}{error && <p className="form-error">{error}</p>}<button className="primary">儲存習慣</button></form>
}

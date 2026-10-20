import { useState, type FormEvent } from 'react'
import { useLifeData } from './features/useLifeData'
import { HabitPage } from './features/HabitPage'
import { AbilityRadar } from './features/AbilityRadar'
import type { Profile, Reward, Todo, WalletSummary } from './types/models'
import './App.css'
import './mobile-navigation.css'
import './habits.css'
import './habit-extras.css'

type Page = '首頁' | '角色設定' | '聊天室' | '我的資料' | '待辦事項' | '打卡習慣' | '錢包與獎勵' | 'API 用量' | '設定'

const navigation: { name: Page; icon: string }[] = [
  { name: '首頁', icon: '⌂' }, { name: '角色設定', icon: '♧' }, { name: '聊天室', icon: '◌' },
  { name: '我的資料', icon: '♡' }, { name: '待辦事項', icon: '✓' }, { name: '打卡習慣', icon: '◉' }, { name: '錢包與獎勵', icon: '◇' },
  { name: 'API 用量', icon: '◫' }, { name: '設定', icon: '⚙' },
]

function App() {
  const data = useLifeData()
  const [page, setPage] = useState<Page>('首頁')
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<string[]>([])
  const profileName = data.profile?.name || '親愛的你'
  const choose = (next: Page) => { setPage(next) }
  const send = () => { if (message.trim()) { setMessages([...messages, message.trim()]); setMessage('') } }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span>✦</span><div>Life Companion<small>陪伴你的每一天</small></div></div>
      <nav aria-label="主選單">{navigation.map(item => <button key={item.name} className={page === item.name ? 'active' : ''} onClick={() => choose(item.name)}><span className="nav-icon">{item.icon}</span>{item.name}</button>)}</nav>
      <div className="profile-mini"><div className="avatar">{data.profile?.nickname.slice(0, 1) || '你'}</div><div><strong>{profileName}</strong><small>今天也慢慢來</small></div><span>⌄</span></div>
    </aside>
    <main>
      <header className="topbar"><div><p className="eyebrow">Life Companion</p><h1>{page}</h1></div><button className="bell" aria-label="通知">♢<i /></button></header>
      <nav className="mobile-nav" aria-label="手機主選單">{navigation.map(item => <button key={item.name} className={page === item.name ? 'active' : ''} onClick={() => choose(item.name)}><span>{item.icon}</span>{item.name}</button>)}</nav>
      <section className="content">{!data.ready ? <Loading /> : data.error ? <DatabaseError message={data.error} retry={data.retry} /> : <>
        {page === '首頁' && <Home name={profileName} todos={data.todos} wallet={data.wallet} setTodoCompleted={data.setTodoCompleted} />}
        {page === '角色設定' && <Character profile={data.profile} saveProfile={data.saveProfile} ability={data.ability} />}
        {page === '聊天室' && <Chat message={message} setMessage={setMessage} messages={messages} send={send} />}
        {page === '我的資料' && <ProfilePage profile={data.profile} saveProfile={data.saveProfile} ability={data.ability} />}
        {page === '待辦事項' && <Tasks todos={data.todos} addTodo={data.addTodo} deleteTodo={data.deleteTodo} setTodoCompleted={data.setTodoCompleted} />}
        {page === '打卡習慣' && <HabitPage loadHabitPeriod={data.loadHabitPeriod} saveHabit={data.saveHabit} deactivateHabit={data.deactivateHabit} setHabitCheckin={data.setHabitCheckin} undoLatestCheckin={data.undoLatestCheckin} applyMonthlyMakeup={data.applyMonthlyMakeup} getPeriodStats={data.getPeriodStats} />}
        {page === '錢包與獎勵' && <Wallet wallet={data.wallet} rewards={data.rewards} />}
        {page === 'API 用量' && <Usage />}
        {page === '設定' && <Settings />}
      </>}</section>
    </main>
  </div>
}

function Loading() { return <div className="card loading">正在準備你的本機資料…</div> }
function DatabaseError({ message, retry }: { message: string; retry: () => Promise<void> }) { return <section className="card loading"><h2>無法開啟本機資料</h2><p>{message}</p><button className="primary" onClick={() => void retry()}>重新載入</button></section> }

function Home({ name, todos, wallet, setTodoCompleted }: { name: string; todos: Todo[]; wallet: WalletSummary; setTodoCompleted: (todo: Todo, completed: boolean) => Promise<void> }) {
  const done = todos.filter(todo => todo.completed).length
  return <><section className="welcome card"><div><p className="date">今天，留一點時間給自己</p><h2>早安，{name} ☀</h2><p>今天想用什麼樣的步調，陪自己走過一天？</p><button className="primary">開始今天的對話 <span>→</span></button></div><div className="sun-orbit"><span>☀</span><i>☁</i><b>✦</b></div></section>
    <div className="dashboard-grid"><section className="card tasks-card"><div className="section-title"><div><p className="eyebrow">TODAY</p><h3>今日待辦</h3></div></div><TodoList todos={todos.slice(0, 3)} setTodoCompleted={setTodoCompleted} /><div className="progress"><span style={{ width: todos.length ? (done / todos.length * 100) + '%' : '0%' }} /><small>已完成 {done} / {todos.length} 件事</small></div></section><section className="card companion-card"><span className="sparkle">✦</span><p className="eyebrow">YOUR COMPANION</p><div className="companion-avatar">❀</div><h3>小光</h3><p>「不必急著變得很好，現在的你也值得被好好對待。」</p><button className="soft-button">和小光聊聊</button></section></div>
    <section className="stats"><Stat icon="✦" value={String(wallet.experience)} label="目前經驗值" /><Stat icon="◇" value={String(wallet.currency)} label="目前遊戲貨幣" /><Stat icon="◷" value={'Lv. ' + wallet.level} label="每 100 經驗值升級" /></section></>
}

function TodoList({ todos, setTodoCompleted, deleteTodo }: { todos: Todo[]; setTodoCompleted: (todo: Todo, completed: boolean) => Promise<void>; deleteTodo?: (id: number) => Promise<void> }) {
  if (!todos.length) return <p className="empty-list">還沒有待辦，新增一件小事開始吧。</p>
  return <div className="task-list">{todos.map(todo => <label key={todo.id} className={todo.completed ? 'done' : ''}><input type="checkbox" checked={todo.completed} onChange={event => void setTodoCompleted(todo, event.target.checked)} /><span>{todo.title}</span><em>{todo.date}</em>{deleteTodo && <button className="delete-button" onClick={() => todo.id && void deleteTodo(todo.id)} aria-label={'刪除 ' + todo.title}>×</button>}</label>)}</div>
}

function Tasks({ todos, addTodo, deleteTodo, setTodoCompleted }: { todos: Todo[]; addTodo: (title: string) => Promise<void>; deleteTodo: (id: number) => Promise<void>; setTodoCompleted: (todo: Todo, completed: boolean) => Promise<void> }) {
  const [title, setTitle] = useState('')
  const submit = (event: FormEvent) => { event.preventDefault(); if (title.trim()) { void addTodo(title); setTitle('') } }
  return <div className="page-stack"><section className="card page-hero"><p className="eyebrow">DAILY RHYTHM</p><h2>把小小的完成，留給今天的你。</h2><p>完成待辦可獲得 +10 經驗值與 +5 遊戲貨幣。</p></section><section className="card tasks-card"><div className="section-title"><h3>今天的待辦</h3></div><form className="todo-form" onSubmit={submit}><input value={title} onChange={event => setTitle(event.target.value)} placeholder="新增一件想完成的事" /><button className="primary compact">＋ 新增待辦</button></form><TodoList todos={todos} setTodoCompleted={setTodoCompleted} deleteTodo={deleteTodo} /></section></div>
}

function ProfileEditor({ profile, saveProfile, title }: { profile?: Profile; saveProfile: (input: Pick<Profile, 'name' | 'nickname' | 'bio'>) => Promise<void>; title: string }) {
  const [name, setName] = useState(profile?.name || '')
  const [nickname, setNickname] = useState(profile?.nickname || '')
  const [bio, setBio] = useState(profile?.bio || '')
  const [saved, setSaved] = useState(false)
  const submit = (event: FormEvent) => { event.preventDefault(); if (name.trim()) { void saveProfile({ name: name.trim(), nickname: nickname.trim() || name.trim(), bio: bio.trim() }).then(() => setSaved(true)) } }
  return <form className="card form-card" onSubmit={submit}><h3>{title}</h3><label>名稱<input value={name} onChange={event => setName(event.target.value)} required placeholder="例如：親愛的你" /></label><label>暱稱<input value={nickname} onChange={event => setNickname(event.target.value)} placeholder="顯示在頭像旁的名字" /></label><label>簡介<textarea value={bio} onChange={event => setBio(event.target.value)} placeholder="寫下一句給自己的話" /></label><div><button className="primary">{saved ? '已儲存 ✓' : '儲存資料'}</button><small className="form-note">資料只儲存在此瀏覽器的 IndexedDB。</small></div></form>
}

function Character({ profile, saveProfile, ability }: { profile?: Profile; saveProfile: (input: Pick<Profile, 'name' | 'nickname' | 'bio'>) => Promise<void>; ability: import('./types/models').AbilitySummary }) { return <div className="page-stack"><section className="card page-hero"><p className="eyebrow">YOUR COMPANION</p><h2>從你的角色卡開始。</h2><p>更新你的名稱與自我介紹，資料會留在這台裝置。</p></section><section className="character-grid"><div className="card character-preview"><div className="companion-avatar large">❀</div><h3>{profile?.nickname || '你'}</h3><p>{profile?.bio || '溫暖、安靜，總是在需要的時候出現。'}</p></div><ProfileEditor profile={profile} saveProfile={saveProfile} title="角色卡" /></section><AbilityRadar ability={ability} /></div> }
function ProfilePage({ profile, saveProfile, ability }: { profile?: Profile; saveProfile: (input: Pick<Profile, 'name' | 'nickname' | 'bio'>) => Promise<void>; ability: import('./types/models').AbilitySummary }) { return <div className="page-stack"><section className="card profile-page"><div className="avatar big">{profile?.nickname.slice(0, 1) || '你'}</div><div><p className="eyebrow">MY SPACE</p><h2>{profile?.name || '親愛的你'}</h2><p>{profile?.bio || '這是一個只屬於你的陪伴角落。'}</p></div></section><AbilityRadar ability={ability} /><ProfileEditor profile={profile} saveProfile={saveProfile} title="編輯我的資料" /></div> }

function Wallet({ wallet, rewards }: { wallet: WalletSummary; rewards: Reward[] }) { return <div className="page-stack"><section className="wallet card"><div><p className="eyebrow">YOUR ENERGY</p><h2>{wallet.currency} <small>遊戲貨幣</small></h2><p>等級 Lv. {wallet.level} ・ 經驗值 {wallet.experience}（本級 {wallet.experienceIntoLevel}/100）</p></div><div className="coin">✦</div></section><section className="card tasks-card"><div className="section-title"><h3>可以兌換的獎勵</h3><button className="text-button">目前貨幣 {wallet.currency}</button></div><div className="rewards">{rewards.map(reward => <RewardCard key={reward.id} reward={reward} />)}</div></section></div> }
function RewardCard({ reward }: { reward: Reward }) { return <div className="reward"><span>✦</span><strong>{reward.name}</strong><small>{reward.cost} 點 ・ {reward.status === 'available' ? '可兌換' : reward.status}</small><button>兌換</button></div> }

function Chat({ message, setMessage, messages, send }: { message: string; setMessage: (value: string) => void; messages: string[]; send: () => void }) { return <section className="chat card"><div className="chat-head"><div className="companion-avatar small">❀</div><div><h3>小光</h3><p><i className="online" />在這裡陪你</p></div></div><div className="chat-body"><div className="message companion">嗨，今天過得怎麼樣？不管你想分享什麼，我都在。</div>{messages.map((text, index) => <div className="message me" key={index}>{text}</div>)}</div><div className="chat-input"><input value={message} onChange={event => setMessage(event.target.value)} onKeyDown={event => event.key === 'Enter' && send()} placeholder="寫下想說的話…" /><button onClick={send} aria-label="送出訊息">↑</button></div><p className="chat-note">此為介面原型，尚未連接 AI 服務。</p></section> }
function Usage() { return <div className="page-stack"><section className="card page-hero"><p className="eyebrow">API USAGE</p><h2>使用情況一目了然。</h2><p>此階段不會儲存 API 金鑰，也沒有連接外部服務。</p></section><section className="usage-grid"><UsageCard label="本月訊息" detail="尚未連接 API" /><UsageCard label="預估花費" detail="尚未連接 API" /><UsageCard label="可用額度" detail="尚未設定" /></section></div> }
function Settings() { return <section className="card settings"><p className="eyebrow">PREFERENCES</p><h2>設定</h2>{[['◐', '外觀', '跟隨系統設定'], ['♧', '角色與對話', '管理陪伴偏好'], ['♢', '資料與隱私', '資料只儲存在此裝置']].map(([icon, title, detail]) => <button key={title}><span>{icon}</span><div><strong>{title}</strong><small>{detail}</small></div><b>›</b></button>)}</section> }
function Stat({ icon, value, label }: { icon: string; value: string; label: string }) { return <div className="card stat"><span>{icon}</span><div><strong>{value}</strong><small>{label}</small></div></div> }
function UsageCard({ label, detail }: { label: string; detail: string }) { return <section className="card usage-card"><p>{label}</p><strong>—</strong><small>{detail}</small></section> }

export default App

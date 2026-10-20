import { useState } from 'react'
import './App.css'

type Page = '首頁' | '角色設定' | '聊天室' | '我的資料' | '待辦與打卡' | '錢包與獎勵' | 'API 用量' | '設定'

const nav: { name: Page; icon: string }[] = [
  { name: '首頁', icon: '⌂' }, { name: '角色設定', icon: '♧' }, { name: '聊天室', icon: '◌' },
  { name: '我的資料', icon: '♡' }, { name: '待辦與打卡', icon: '✓' }, { name: '錢包與獎勵', icon: '◇' },
  { name: 'API 用量', icon: '◫' }, { name: '設定', icon: '⚙' },
]

function App() {
  const [page, setPage] = useState<Page>('首頁')
  const [menu, setMenu] = useState(false)
  const [tasks, setTasks] = useState([false, false, false])
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<string[]>([])
  const changeTask = (index: number) => setTasks(tasks.map((task, i) => i === index ? !task : task))
  const send = () => { if (draft.trim()) { setMessages([...messages, draft.trim()]); setDraft('') } }
  const choose = (next: Page) => { setPage(next); setMenu(false) }

  return <div className="app-shell">
    <aside className={`sidebar ${menu ? 'is-open' : ''}`}>
      <div className="brand"><span>✦</span><div>Life Companion<small>陪伴你的每一天</small></div></div>
      <nav aria-label="主選單">{nav.map(item => <button key={item.name} className={page === item.name ? 'active' : ''} onClick={() => choose(item.name)}><span className="nav-icon">{item.icon}</span>{item.name}</button>)}</nav>
      <div className="profile-mini"><div className="avatar">你</div><div><strong>親愛的你</strong><small>今天也慢慢來</small></div><span>⌄</span></div>
    </aside>
    <main>
      <header className="topbar"><button className="menu-button" aria-label="開啟選單" onClick={() => setMenu(!menu)}>☰</button><div><p className="eyebrow">Life Companion</p><h1>{page}</h1></div><button className="bell" aria-label="通知">♢<i /></button></header>
      <section className="content">
        {page === '首頁' && <Home tasks={tasks} changeTask={changeTask} />}
        {page === '角色設定' && <Character />}
        {page === '聊天室' && <Chat draft={draft} setDraft={setDraft} messages={messages} send={send} />}
        {page === '我的資料' && <Profile />}
        {page === '待辦與打卡' && <Tasks tasks={tasks} changeTask={changeTask} />}
        {page === '錢包與獎勵' && <Wallet />}
        {page === 'API 用量' && <Usage />}
        {page === '設定' && <Settings />}
      </section>
    </main>
  </div>
}

function Home({ tasks, changeTask }: { tasks: boolean[]; changeTask: (i: number) => void }) {
  const done = tasks.filter(Boolean).length
  return <><section className="welcome card"><div><p className="date">星期一，10 月 20 日</p><h2>早安，親愛的你 ☀</h2><p>今天想用什麼樣的步調，陪自己走過一天？</p><button className="primary">開始今天的對話 <span>→</span></button></div><div className="sun-orbit"><span>☀</span><i>☁</i><b>✦</b></div></section>
    <div className="dashboard-grid"><section className="card tasks-card"><div className="section-title"><div><p className="eyebrow">TODAY</p><h3>今日待辦</h3></div><button className="text-button">查看全部</button></div><TaskList tasks={tasks} changeTask={changeTask} /><div className="progress"><span style={{ width: `${done / 3 * 100}%` }} /><small>已完成 {done} / 3 件事</small></div></section><section className="card companion-card"><span className="sparkle">✦</span><p className="eyebrow">YOUR COMPANION</p><div className="companion-avatar">❀</div><h3>小光</h3><p>「不必急著變得很好，現在的你也值得被好好對待。」</p><button className="soft-button">和小光聊聊</button></section></div>
    <section className="stats"><Stat icon="🔥" value="4" label="連續打卡天數" /><Stat icon="✦" value="120" label="目前能量點數" /><Stat icon="◷" value="12 分鐘" label="今日陪伴時光" /></section></>
}
function TaskList({ tasks, changeTask }: { tasks: boolean[]; changeTask: (i: number) => void }) {
  const labels = ['喝一杯水，照顧身體', '完成最重要的一件事', '留 10 分鐘給自己']
  return <div className="task-list">{labels.map((label, i) => <label key={label} className={tasks[i] ? 'done' : ''}><input type="checkbox" checked={tasks[i]} onChange={() => changeTask(i)} /><span>{label}</span><em>{['早晨', '工作', '夜晚'][i]}</em></label>)}</div>
}
function Tasks({ tasks, changeTask }: { tasks: boolean[]; changeTask: (i: number) => void }) { return <div className="page-stack"><section className="card page-hero"><p className="eyebrow">DAILY RHYTHM</p><h2>把小小的完成，留給今天的你。</h2><p>這裡是你的輕量清單與溫柔打卡紀錄。</p></section><section className="card tasks-card"><div className="section-title"><h3>今天的待辦</h3><button className="primary compact">＋ 新增待辦</button></div><TaskList tasks={tasks} changeTask={changeTask} /></section></div> }
function Chat({ draft, setDraft, messages, send }: { draft: string; setDraft: (v: string) => void; messages: string[]; send: () => void }) { return <section className="chat card"><div className="chat-head"><div className="companion-avatar small">❀</div><div><h3>小光</h3><p><i className="online" />在這裡陪你</p></div><button className="text-button">⋯</button></div><div className="chat-body"><div className="message companion">嗨，今天過得怎麼樣？不管你想分享什麼，我都在。</div>{messages.map((text, i) => <div className="message me" key={`${i}-${text}`}>{text}</div>)}</div><div className="chat-input"><input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="寫下想說的話…" /><button onClick={send} aria-label="送出訊息">↑</button></div><p className="chat-note">此為介面原型，尚未連接 AI 服務。</p></section> }
function Character() { return <div className="page-stack"><section className="card page-hero"><p className="eyebrow">YOUR COMPANION</p><h2>創造一位懂得陪伴你的角色。</h2><p>調整名稱、氛圍與陪伴方式，讓每次對話更貼近你。</p></section><section className="character-grid"><div className="card character-preview"><div className="companion-avatar large">❀</div><h3>小光</h3><p>溫暖、安靜，總是在需要的時候出現。</p></div><div className="card form-card"><label>角色名稱<input defaultValue="小光" /></label><label>陪伴風格<select defaultValue="溫暖支持"><option>溫暖支持</option><option>輕鬆幽默</option><option>清晰務實</option></select></label><label>一句話介紹<textarea defaultValue="陪你慢慢找到自己的節奏。" /></label><button className="primary">儲存設定</button></div></section></div> }
function Profile() { return <div className="page-stack"><section className="card profile-page"><div className="avatar big">你</div><div><p className="eyebrow">MY SPACE</p><h2>親愛的你</h2><p>這是一個只屬於你的陪伴角落。</p></div><button className="soft-button">編輯資料</button></section><section className="card empty-state"><span>♡</span><h3>慢慢認識自己</h3><p>你的心情、習慣與回憶，會在未來陪你回顧走過的路。</p></section></div> }
function Wallet() { return <div className="page-stack"><section className="wallet card"><div><p className="eyebrow">YOUR ENERGY</p><h2>120 <small>能量點數</small></h2><p>每一點，都是你照顧自己的痕跡。</p></div><div className="coin">✦</div></section><section className="card tasks-card"><div className="section-title"><h3>可以兌換的獎勵</h3><button className="text-button">獎勵紀錄</button></div><div className="rewards"><Reward icon="☕" title="一杯喜歡的飲料" points="80" /><Reward icon="🌿" title="一段完全放空的時光" points="150" /><Reward icon="✉" title="寫給自己的小信" points="200" /></div></section></div> }
function Usage() { return <div className="page-stack"><section className="card page-hero"><p className="eyebrow">API USAGE</p><h2>使用情況一目了然。</h2><p>連接服務後，這裡會顯示你的用量與預估花費。</p></section><section className="usage-grid"><UsageCard label="本月訊息" detail="尚未連接 API" /><UsageCard label="預估花費" detail="尚未連接 API" /><UsageCard label="可用額度" detail="尚未設定" /></section></div> }
function Settings() { return <section className="card settings"><p className="eyebrow">PREFERENCES</p><h2>設定</h2>{[['◐', '外觀', '跟隨系統設定'], ['♧', '角色與對話', '管理陪伴偏好'], ['♢', '資料與隱私', '你的資料由你掌握']].map(([icon, title, detail]) => <button key={title}><span>{icon}</span><div><strong>{title}</strong><small>{detail}</small></div><b>›</b></button>)}</section> }
function Stat({ icon, value, label }: { icon: string; value: string; label: string }) { return <div className="card stat"><span>{icon}</span><div><strong>{value}</strong><small>{label}</small></div></div> }
function Reward({ icon, title, points }: { icon: string; title: string; points: string }) { return <div className="reward"><span>{icon}</span><strong>{title}</strong><small>{points} 點</small><button>兌換</button></div> }
function UsageCard({ label, detail }: { label: string; detail: string }) { return <section className="card usage-card"><p>{label}</p><strong>—</strong><small>{detail}</small></section> }

export default App

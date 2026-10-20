import type { AbilitySummary } from '../types/models'

const labels = [
  ['intelligence', '智力'],
  ['fitness', '體力'],
  ['willpower', '意志'],
  ['charisma', '魅力'],
  ['creativity', '創造力'],
] as const

function point(index: number, ratio: number, radius = 82) {
  const angle = -Math.PI / 2 + index * Math.PI * 2 / 5
  return [110 + Math.cos(angle) * radius * ratio, 110 + Math.sin(angle) * radius * ratio]
}

export function AbilityRadar({ ability }: { ability: AbilitySummary }) {
  const grid = labels.map((_, index) => point(index, 1).join(',')).join(' ')
  const shape = labels.map(([key], index) => point(index, ability.percentages[key] / 100).join(',')).join(' ')
  if (!ability.total) return <section className="card ability-radar empty-radar"><h3>五項能力</h3><p>尚未累積能力點數；完成打卡習慣後會顯示五邊形比例。</p></section>
  return <section className="card ability-radar"><div><h3>五項能力</h3><svg viewBox="0 0 220 220" role="img" aria-label="五項能力比例圖"><polygon points={grid} className="radar-grid" /><polygon points={shape} className="radar-shape" />{labels.map((_, index) => <line key={index} x1="110" y1="110" x2={point(index, 1)[0]} y2={point(index, 1)[1]} className="radar-line" />)}</svg></div><ul>{labels.map(([key, label]) => <li key={key}><span>{label}</span><b>{ability.raw[key]} 點</b><em>{ability.percentages[key].toFixed(0)}%</em></li>)}</ul></section>
}

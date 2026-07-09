import { useMemo, useState } from 'react'
import type { TrainingRecord } from '../types'
import {
  dailyMetricSeries,
  exerciseMaxSeries,
  knownExerciseNames,
  weeklyVolumes,
  type DatePoint,
  type WeekVolume,
} from '../lib/stats'

const W = 340
const H = 170
const PAD = { top: 16, right: 52, bottom: 22, left: 38 }

function shortDate(date: string): string {
  const [, m, d] = date.split('-')
  return `${Number(m)}/${Number(d)}`
}

function formatValue(value: number): string {
  return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(1)
}

function Tooltip({ x, y, text }: { x: number; y: number; text: string }) {
  const w = text.length * 6.5 + 12
  const left = Math.min(Math.max(x - w / 2, 2), W - w - 2)
  const top = y - 26 < 2 ? y + 12 : y - 26
  return (
    <g pointerEvents="none">
      <rect x={left} y={top} width={w} height={18} rx={4} className="chart-tooltip-box" />
      <text x={left + w / 2} y={top + 12.5} textAnchor="middle" className="chart-tooltip-text">
        {text}
      </text>
    </g>
  )
}

function LineChart({ points, unit }: { points: DatePoint[]; unit: string }) {
  const [active, setActive] = useState<number | null>(null)

  if (points.length === 0) {
    return <p className="empty">まだ記録がありません</p>
  }

  const values = points.map((p) => p.value)
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const pad = (hi - lo) * 0.15 || Math.max(hi * 0.1, 1)
  const y0 = Math.max(0, lo - pad)
  const y1 = hi + pad

  const times = points.map((p) => new Date(`${p.date}T00:00:00`).getTime())
  const t0 = times[0]
  const t1 = times[times.length - 1]
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom
  const px = (t: number) => (t1 === t0 ? PAD.left + plotW / 2 : PAD.left + ((t - t0) / (t1 - t0)) * plotW)
  const py = (v: number) => PAD.top + (1 - (v - y0) / (y1 - y0)) * plotH

  const xs = times.map(px)
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xs[i]},${py(p.value)}`).join(' ')
  const ticks = [y0, (y0 + y1) / 2, y1]
  const last = points[points.length - 1]

  return (
    <svg
      className="chart"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      onPointerLeave={() => setActive(null)}
    >
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.left} y1={py(t)} x2={W - PAD.right} y2={py(t)} className="chart-grid" />
          <text x={PAD.left - 6} y={py(t) + 3} textAnchor="end" className="chart-axis">
            {formatValue(t)}
          </text>
        </g>
      ))}
      <text x={xs[0]} y={H - 6} textAnchor="middle" className="chart-axis">
        {shortDate(points[0].date)}
      </text>
      {points.length > 1 && (
        <text x={xs[xs.length - 1]} y={H - 6} textAnchor="middle" className="chart-axis">
          {shortDate(last.date)}
        </text>
      )}
      <path d={path} className="chart-line" />
      {active != null && active < points.length - 1 && (
        <circle cx={xs[active]} cy={py(points[active].value)} r={4} className="chart-dot" />
      )}
      <circle cx={xs[xs.length - 1]} cy={py(last.value)} r={4} className="chart-dot" />
      {(() => {
        const label = `${formatValue(last.value)}${unit}`
        const fitsRight = xs[xs.length - 1] + 7 + label.length * 6 <= W
        return (
          <text
            x={fitsRight ? xs[xs.length - 1] + 7 : xs[xs.length - 1]}
            y={fitsRight ? py(last.value) + 3 : py(last.value) - 9}
            textAnchor={fitsRight ? 'start' : 'end'}
            className="chart-end-label"
          >
            {label}
          </text>
        )
      })()}
      {points.map((p, i) => {
        const left = i === 0 ? PAD.left - 8 : (xs[i - 1] + xs[i]) / 2
        const right = i === points.length - 1 ? W - PAD.right + 8 : (xs[i] + xs[i + 1]) / 2
        return (
          <rect
            key={p.date}
            x={left}
            y={0}
            width={Math.max(right - left, 0)}
            height={H}
            fill="transparent"
            onPointerEnter={() => setActive(i)}
            onPointerDown={() => setActive(i)}
          />
        )
      })}
      {active != null && (
        <Tooltip
          x={xs[active]}
          y={py(points[active].value)}
          text={`${shortDate(points[active].date)} ${formatValue(points[active].value)}${unit}`}
        />
      )}
    </svg>
  )
}

function WeeklyBarChart({ data }: { data: WeekVolume[] }) {
  const [active, setActive] = useState<number | null>(null)

  const max = Math.max(...data.map((d) => d.totalVolumeKg))
  if (max === 0) {
    return <p className="empty">まだ記録がありません</p>
  }

  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom
  const slot = plotW / data.length
  const barW = Math.min(24, slot * 0.6)
  const py = (v: number) => PAD.top + (1 - v / (max * 1.15)) * plotH
  const baseline = PAD.top + plotH

  return (
    <svg
      className="chart"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      onPointerLeave={() => setActive(null)}
    >
      {[0, max / 2, max].map((t) => (
        <g key={t}>
          <line x1={PAD.left} y1={py(t)} x2={W - PAD.right} y2={py(t)} className="chart-grid" />
          <text x={PAD.left - 6} y={py(t) + 3} textAnchor="end" className="chart-axis">
            {Math.round(t).toLocaleString()}
          </text>
        </g>
      ))}
      {data.map((d, i) => {
        const cx = PAD.left + slot * i + slot / 2
        const x = cx - barW / 2
        const top = py(d.totalVolumeKg)
        const h = baseline - top
        const r = Math.min(4, h)
        return (
          <g key={d.weekStart}>
            {h > 0 && (
              <path
                d={`M${x},${baseline} L${x},${top + r} Q${x},${top} ${x + r},${top} L${x + barW - r},${top} Q${x + barW},${top} ${x + barW},${top + r} L${x + barW},${baseline} Z`}
                className="chart-bar"
              />
            )}
            <text x={cx} y={H - 6} textAnchor="middle" className="chart-axis">
              {shortDate(d.weekStart)}
            </text>
            {i === data.length - 1 && d.totalVolumeKg > 0 && (
              <text x={cx} y={top - 5} textAnchor="middle" className="chart-end-label">
                {Math.round(d.totalVolumeKg).toLocaleString()}
              </text>
            )}
            <rect
              x={PAD.left + slot * i}
              y={0}
              width={slot}
              height={H}
              fill="transparent"
              onPointerEnter={() => setActive(i)}
              onPointerDown={() => setActive(i)}
            />
          </g>
        )
      })}
      {active != null && (
        <Tooltip
          x={PAD.left + slot * active + slot / 2}
          y={py(data[active].totalVolumeKg)}
          text={`${shortDate(data[active].weekStart)}週 ${Math.round(data[active].totalVolumeKg).toLocaleString()}kg`}
        />
      )}
    </svg>
  )
}

export default function Stats({ records }: { records: TrainingRecord[] }) {
  const exerciseNames = useMemo(() => knownExerciseNames(records), [records])
  const [exercise, setExercise] = useState('')
  const selected = exercise || exerciseNames[0] || ''

  const weightSeries = useMemo(
    () => dailyMetricSeries(records, (r) => r.bodyWeightKg),
    [records],
  )
  const sleepSeries = useMemo(() => dailyMetricSeries(records, (r) => r.sleepHours), [records])
  const volumes = useMemo(() => weeklyVolumes(records), [records])
  const exerciseSeries = useMemo(
    () => (selected ? exerciseMaxSeries(records, selected) : null),
    [records, selected],
  )

  if (records.length === 0) {
    return <p className="empty">記録がありません。「入力」タブから記録を追加してください。</p>
  }

  return (
    <>
      <div className="card">
        <h2>週別ボリューム (kg)</h2>
        <WeeklyBarChart data={volumes} />
      </div>

      <div className="card">
        <h2>種目別の最大負荷</h2>
        {exerciseNames.length === 0 || !exerciseSeries ? (
          <p className="empty">まだ筋トレの記録がありません</p>
        ) : (
          <>
            <select value={selected} onChange={(e) => setExercise(e.target.value)}>
              {exerciseNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <LineChart points={exerciseSeries.points} unit={exerciseSeries.unit} />
          </>
        )}
      </div>

      <div className="card">
        <h2>体重の推移 (kg)</h2>
        <LineChart points={weightSeries} unit="kg" />
      </div>

      <div className="card">
        <h2>睡眠時間の推移 (時間)</h2>
        <LineChart points={sleepSeries} unit="h" />
      </div>
    </>
  )
}

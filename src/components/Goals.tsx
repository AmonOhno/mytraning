import { useMemo, useState } from 'react'
import type { Goals, PeriodGoal, TrainingRecord } from '../types'
import {
  goalPeriodRange,
  rangeSummary,
  recentGoalPeriodRanges,
  type GoalPeriod,
  type WeeklySummary,
} from '../lib/stats'

interface Props {
  goals: Goals
  records: TrainingRecord[]
  onSave: (goals: Goals) => void
}

const PERIODS: { key: GoalPeriod; title: string }[] = [
  { key: 'daily', title: '今日の目標' },
  { key: 'weekly', title: '今週の目標' },
  { key: 'monthly', title: '今月の目標' },
]

interface Metric {
  key: keyof PeriodGoal
  label: string
  unit: string
  pick: (s: WeeklySummary) => number
}

const METRICS: Metric[] = [
  { key: 'volumeKg', label: '総ボリューム', unit: 'kg', pick: (s) => s.totalVolumeKg },
  { key: 'cardioMinutes', label: '有酸素', unit: '分', pick: (s) => s.cardioMinutes },
  { key: 'trainingDays', label: 'トレーニング日数', unit: '日', pick: (s) => s.trainingDays },
]

/** 今日の目標では日数目標は意味を持たないため除外する */
function metricsFor(period: GoalPeriod): Metric[] {
  return period === 'daily' ? METRICS.filter((m) => m.key !== 'trainingDays') : METRICS
}

/** 達成度履歴の表示期間数と件数の単位 */
const HISTORY: Record<GoalPeriod, { count: number; unit: string }> = {
  daily: { count: 7, unit: '日' },
  weekly: { count: 8, unit: '週' },
  monthly: { count: 6, unit: 'ヶ月' },
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

function shortDate(date: string): string {
  const [, m, d] = date.split('-')
  return `${Number(m)}/${Number(d)}`
}

function historyLabel(period: GoalPeriod, from: string, to: string, isCurrent: boolean): string {
  if (isCurrent) {
    return period === 'daily' ? '今日' : period === 'weekly' ? '今週' : '今月'
  }
  if (period === 'daily') {
    const day = new Date(`${from}T00:00:00`).getDay()
    return `${shortDate(from)}(${WEEKDAYS[day]})`
  }
  if (period === 'weekly') return `${shortDate(from)}〜${shortDate(to)}`
  const [y, m] = from.split('-')
  return `${y}/${Number(m)}`
}

interface HistoryMetric {
  key: keyof PeriodGoal
  label: string
  percent: number
  achieved: boolean
}

interface HistoryRow {
  from: string
  label: string
  achieved: boolean
  metrics: HistoryMetric[]
}

type Draft = Record<GoalPeriod, Record<keyof PeriodGoal, string>>

function toDraft(goals: Goals): Draft {
  const period = (g: PeriodGoal) => ({
    volumeKg: g.volumeKg?.toString() ?? '',
    cardioMinutes: g.cardioMinutes?.toString() ?? '',
    trainingDays: g.trainingDays?.toString() ?? '',
  })
  return { daily: period(goals.daily), weekly: period(goals.weekly), monthly: period(goals.monthly) }
}

function parseTarget(value: string): number | null {
  if (!value.trim()) return null
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

function fromDraft(draft: Draft): Goals {
  const period = (p: Record<keyof PeriodGoal, string>): PeriodGoal => ({
    volumeKg: parseTarget(p.volumeKg),
    cardioMinutes: parseTarget(p.cardioMinutes),
    trainingDays: parseTarget(p.trainingDays),
  })
  return {
    daily: { ...period(draft.daily), trainingDays: null },
    weekly: period(draft.weekly),
    monthly: period(draft.monthly),
  }
}

function GoalRow({ metric, current, target }: { metric: Metric; current: number; target: number }) {
  const percent = Math.min(Math.floor((current / target) * 100), 999)
  const achieved = current >= target
  return (
    <div className="goal-row">
      <div className="goal-row-header">
        <span>{metric.label}</span>
        <span className={achieved ? 'goal-value achieved' : 'goal-value'}>
          {current.toLocaleString()} / {target.toLocaleString()}
          {metric.unit}({percent}%)
        </span>
      </div>
      <div className="progress">
        <div
          className={achieved ? 'progress-fill achieved' : 'progress-fill'}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    </div>
  )
}

export default function GoalsTab({ goals, records, onSave }: Props) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(goals))
  const [savedPeriod, setSavedPeriod] = useState<GoalPeriod | null>(null)

  const summaries = useMemo(() => {
    const result = {} as Record<GoalPeriod, { summary: WeeklySummary; from: string; to: string }>
    for (const { key } of PERIODS) {
      const { from, to } = goalPeriodRange(key)
      result[key] = { summary: rangeSummary(records, from, to), from, to }
    }
    return result
  }, [records])

  const histories = useMemo(() => {
    const result = {} as Record<GoalPeriod, HistoryRow[]>
    for (const { key } of PERIODS) {
      const active = metricsFor(key).filter((m) => goals[key][m.key] != null)
      if (active.length === 0) {
        result[key] = []
        continue
      }
      result[key] = recentGoalPeriodRanges(key, HISTORY[key].count).map(({ from, to }, i) => {
        const summary = rangeSummary(records, from, to)
        const metrics = active.map((m) => {
          const target = goals[key][m.key] as number
          const current = m.pick(summary)
          return {
            key: m.key,
            label: m.label,
            percent: Math.min(Math.floor((current / target) * 100), 999),
            achieved: current >= target,
          }
        })
        return {
          from,
          label: historyLabel(key, from, to, i === 0),
          achieved: metrics.every((m) => m.achieved),
          metrics,
        }
      })
    }
    return result
  }, [records, goals])

  const handleChange = (period: GoalPeriod, key: keyof PeriodGoal, value: string) => {
    setDraft((prev) => ({ ...prev, [period]: { ...prev[period], [key]: value } }))
    setSavedPeriod(null)
  }

  const handleSave = (period: GoalPeriod) => {
    onSave(fromDraft(draft))
    setSavedPeriod(period)
  }

  return (
    <>
      {PERIODS.map(({ key, title }) => {
        const { summary, from, to } = summaries[key]
        const metrics = metricsFor(key)
        const active = metrics.filter((m) => goals[key][m.key] != null)
        return (
          <div key={key} className="card form">
            <h2>
              {title}
              <span className="goal-range">
                {key === 'daily' ? shortDate(from) : `${shortDate(from)}〜${shortDate(to)}`}
              </span>
            </h2>

            {active.length === 0 ? (
              <p className="empty">目標が未設定です。下の入力欄から設定してください。</p>
            ) : (
              active.map((m) => (
                <GoalRow
                  key={m.key}
                  metric={m}
                  current={m.pick(summary)}
                  target={goals[key][m.key] as number}
                />
              ))
            )}

            {histories[key].length > 0 && (
              <>
                <h3>
                  達成度の履歴
                  <span className="goal-range">
                    直近{HISTORY[key].count}
                    {HISTORY[key].unit}で {histories[key].filter((r) => r.achieved).length}
                    {HISTORY[key].unit}達成
                  </span>
                </h3>
                <ul className="goal-history">
                  {histories[key].map((row) => (
                    <li key={row.from}>
                      <span
                        className={
                          row.achieved ? 'goal-history-badge achieved' : 'goal-history-badge'
                        }
                      >
                        {row.achieved ? '達成' : '未達'}
                      </span>
                      <span className="goal-history-label">{row.label}</span>
                      <span className="goal-history-metrics">
                        {row.metrics.map((m) => (
                          <span key={m.key} className={m.achieved ? 'achieved' : undefined}>
                            {m.label} {m.percent}%
                          </span>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <h3>目標を設定(空欄は未設定)</h3>
            <div className="goal-inputs">
              {metrics.map((m) => (
                <label key={m.key}>
                  {m.label} ({m.unit})
                  <input
                    type="number"
                    min="0"
                    inputMode="decimal"
                    value={draft[key][m.key]}
                    onChange={(e) => handleChange(key, m.key, e.target.value)}
                  />
                </label>
              ))}
            </div>
            <div className="row actions">
              <button type="button" className="primary" onClick={() => handleSave(key)}>
                保存
              </button>
            </div>
            {savedPeriod === key && (
              <p className="success" role="status">
                目標を保存しました
              </p>
            )}
          </div>
        )
      })}
    </>
  )
}

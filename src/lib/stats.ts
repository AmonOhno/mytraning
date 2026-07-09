import type { TrainingRecord } from '../types'

export function recordVolume(record: TrainingRecord): number {
  return record.strength.reduce(
    (total, ex) => total + ex.sets.reduce((s, set) => s + set.weightKg * set.reps, 0),
    0,
  )
}

export interface WeeklySummary {
  trainingDays: number
  totalVolumeKg: number
  cardioMinutes: number
}

function toDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 直近7日間(今日を含む)のサマリー */
export function weeklySummary(records: TrainingRecord[], today = new Date()): WeeklySummary {
  const start = new Date(today)
  start.setDate(start.getDate() - 6)
  const from = toDateString(start)
  const to = toDateString(today)

  const inRange = records.filter((r) => r.date >= from && r.date <= to)
  const trainingDays = new Set(
    inRange.filter((r) => r.strength.length > 0 || r.cardio.length > 0).map((r) => r.date),
  ).size

  return {
    trainingDays,
    totalVolumeKg: inRange.reduce((sum, r) => sum + recordVolume(r), 0),
    cardioMinutes: Math.round(
      inRange.reduce((sum, r) => sum + r.cardio.reduce((s, c) => s + c.durationSec, 0), 0) / 60,
    ),
  }
}

/** 秒数を H:MM:SS 形式にフォーマット */
export function formatHMS(totalSec: number): string {
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export interface DatePoint {
  date: string // YYYY-MM-DD
  value: number
}

/**
 * 体重・睡眠など日付ごとの数値の推移(日付昇順)。
 * 同一日付に複数記録がある場合は updatedAt が新しい記録の値を採用する。
 */
export function dailyMetricSeries(
  records: TrainingRecord[],
  pick: (r: TrainingRecord) => number | null,
): DatePoint[] {
  const byDate = new Map<string, number>()
  const sorted = [...records].sort((a, b) =>
    a.date !== b.date ? (a.date < b.date ? -1 : 1) : a.updatedAt < b.updatedAt ? -1 : 1,
  )
  for (const r of sorted) {
    const value = pick(r)
    if (value != null) byDate.set(r.date, value)
  }
  return [...byDate.entries()].map(([date, value]) => ({ date, value }))
}

export interface WeekVolume {
  /** 週の開始日(月曜, YYYY-MM-DD) */
  weekStart: string
  totalVolumeKg: number
}

/** 直近 weeks 週間(今週を含む)の週別総ボリューム。古い週から順に返す */
export function weeklyVolumes(
  records: TrainingRecord[],
  weeks = 8,
  today = new Date(),
): WeekVolume[] {
  const monday = new Date(today)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))

  const result: WeekVolume[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(monday)
    start.setDate(start.getDate() - i * 7)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    const from = toDateString(start)
    const to = toDateString(end)
    const total = records
      .filter((r) => r.date >= from && r.date <= to)
      .reduce((sum, r) => sum + recordVolume(r), 0)
    result.push({ weekStart: from, totalVolumeKg: total })
  }
  return result
}

export interface ExerciseSeries {
  unit: 'kg' | '秒'
  points: DatePoint[]
}

/**
 * 指定種目の日別最大負荷の推移。
 * 重さ×回数のセットがあれば最大重量(kg)、秒数ベースのみの種目は最大秒数を返す。
 */
export function exerciseMaxSeries(records: TrainingRecord[], name: string): ExerciseSeries {
  const sets = records.flatMap((r) =>
    r.strength.filter((ex) => ex.name === name).flatMap((ex) => ex.sets.map((s) => ({ date: r.date, set: s }))),
  )
  const hasWeight = sets.some(({ set }) => set.seconds == null)
  const byDate = new Map<string, number>()
  for (const { date, set } of sets) {
    const value = hasWeight ? (set.seconds == null ? set.weightKg : null) : set.seconds
    if (value == null) continue
    byDate.set(date, Math.max(byDate.get(date) ?? 0, value))
  }
  const points = [...byDate.entries()]
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => (a.date < b.date ? -1 : 1))
  return { unit: hasWeight ? 'kg' : '秒', points }
}

/** 過去に入力された種目名(新しい記録優先・重複なし) */
export function knownExerciseNames(records: TrainingRecord[]): string[] {
  const names: string[] = []
  for (const r of records) {
    for (const ex of r.strength) {
      if (ex.name && !names.includes(ex.name)) names.push(ex.name)
    }
  }
  return names
}

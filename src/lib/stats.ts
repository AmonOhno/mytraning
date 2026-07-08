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

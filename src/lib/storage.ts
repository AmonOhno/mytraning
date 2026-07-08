import type { AppSettings, CardioSession, TrainingRecord } from '../types'

const RECORDS_KEY = 'mytraining.records'
const SETTINGS_KEY = 'mytraining.settings'

/** 旧形式(seconds なしのセット / minutes ベースの有酸素)を現行形式へ変換 */
function migrateRecord(r: TrainingRecord): TrainingRecord {
  return {
    ...r,
    strength: (r.strength ?? []).map((ex) => ({
      ...ex,
      sets: ex.sets.map((s) => ({ ...s, seconds: s.seconds ?? null })),
    })),
    cardio: (r.cardio ?? []).map((c) => {
      const legacyMinutes = (c as unknown as { minutes?: number }).minutes
      const { minutes: _drop, ...rest } = c as CardioSession & { minutes?: number }
      return {
        ...rest,
        durationSec: c.durationSec ?? Math.round((legacyMinutes ?? 0) * 60),
      }
    }),
  }
}

export function loadRecords(): TrainingRecord[] {
  try {
    const raw = localStorage.getItem(RECORDS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(migrateRecord) : []
  } catch {
    return []
  }
}

function persistRecords(records: TrainingRecord[]): void {
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records))
}

export function saveRecord(record: TrainingRecord): TrainingRecord[] {
  const records = loadRecords()
  const index = records.findIndex((r) => r.id === record.id)
  if (index >= 0) {
    records[index] = record
  } else {
    records.push(record)
  }
  records.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
  persistRecords(records)
  return records
}

/**
 * 同日付の複数レコードを1つに統合する。
 * - 筋トレ: 同名種目はセットを連結、それ以外は追加
 * - 有酸素: 連結
 * - 体重・疲労度・睡眠: 後から登録されたレコードの値を優先(非 null のみ)
 * - メモ: 改行で連結
 */
export function mergeRecordsForDate(date: string): TrainingRecord[] {
  const records = loadRecords()
  const targets = records
    .filter((r) => r.date === date)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  if (targets.length < 2) return records

  const merged: TrainingRecord = {
    id: targets[0].id,
    date,
    strength: [],
    cardio: [],
    bodyWeightKg: null,
    fatigue: null,
    sleepHours: null,
    memo: '',
    createdAt: targets[0].createdAt,
    updatedAt: new Date().toISOString(),
  }
  for (const r of targets) {
    for (const ex of r.strength) {
      const existing = merged.strength.find((e) => e.name === ex.name)
      if (existing) {
        existing.sets.push(...ex.sets)
      } else {
        merged.strength.push({ name: ex.name, sets: [...ex.sets] })
      }
    }
    merged.cardio.push(...r.cardio)
    if (r.bodyWeightKg != null) merged.bodyWeightKg = r.bodyWeightKg
    if (r.fatigue != null) merged.fatigue = r.fatigue
    if (r.sleepHours != null) merged.sleepHours = r.sleepHours
    if (r.memo.trim()) merged.memo = merged.memo ? `${merged.memo}\n${r.memo.trim()}` : r.memo.trim()
  }

  const next = records.filter((r) => r.date !== date)
  next.push(merged)
  next.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
  persistRecords(next)
  return next
}

export function deleteRecord(id: string): TrainingRecord[] {
  const records = loadRecords().filter((r) => r.id !== id)
  persistRecords(records)
  return records
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { myosWebhookUrl: '' }
    return { myosWebhookUrl: '', ...JSON.parse(raw) }
  } catch {
    return { myosWebhookUrl: '' }
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export function newId(): string {
  return crypto.randomUUID()
}

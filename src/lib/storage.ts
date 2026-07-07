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

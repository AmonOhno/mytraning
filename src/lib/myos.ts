import type { MyosExport, TrainingRecord } from '../types'

export function buildExport(records: TrainingRecord[]): MyosExport {
  return {
    schemaVersion: 1,
    source: 'mytraining',
    exportedAt: new Date().toISOString(),
    records,
  }
}

export function downloadExport(records: TrainingRecord[]): void {
  const payload = buildExport(records)
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `mytraining-export-${payload.exportedAt.slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function sendToMyos(
  webhookUrl: string,
  records: TrainingRecord[],
): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildExport(records)),
    })
    if (res.ok) {
      return { ok: true, message: `送信成功 (${records.length}件, HTTP ${res.status})` }
    }
    return { ok: false, message: `送信失敗: HTTP ${res.status}` }
  } catch (e) {
    return { ok: false, message: `送信エラー: ${e instanceof Error ? e.message : String(e)}` }
  }
}

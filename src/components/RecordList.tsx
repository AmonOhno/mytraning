import type { TrainingRecord } from '../types'
import {
  boutsSec,
  eventActiveSec,
  formatHMS,
  recordEventLoad,
  recordVolume,
} from '../lib/stats'

interface Props {
  records: TrainingRecord[]
  onEdit: (record: TrainingRecord) => void
  onDelete: (id: string) => void
  onMergeDate: (date: string) => void
}

const FATIGUE_LABELS = ['', '絶好調', '好調', '普通', '疲れ気味', '極度の疲労']

export default function RecordList({ records, onEdit, onDelete, onMergeDate }: Props) {
  if (records.length === 0) {
    return <p className="empty">まだ記録がありません。「入力」タブから記録を追加しましょう。</p>
  }

  const dateCounts = new Map<string, number>()
  for (const r of records) {
    dateCounts.set(r.date, (dateCounts.get(r.date) ?? 0) + 1)
  }

  return (
    <div className="record-list">
      {records.map((r, idx) => (
        <div className="card record" key={r.id}>
          <div className="record-header">
            <strong>{r.date}</strong>
            <div className="row">
              {(dateCounts.get(r.date) ?? 0) > 1 &&
                records.findIndex((x) => x.date === r.date) === idx && (
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => {
                      const n = dateCounts.get(r.date) ?? 0
                      if (confirm(`${r.date} の ${n} 件の記録を1つに統合しますか?`)) {
                        onMergeDate(r.date)
                      }
                    }}
                  >
                    統合
                  </button>
                )}
              <button type="button" className="ghost" onClick={() => onEdit(r)}>
                編集
              </button>
              <button
                type="button"
                className="ghost danger"
                onClick={() => {
                  if (confirm(`${r.date} の記録を削除しますか?`)) onDelete(r.id)
                }}
              >
                削除
              </button>
            </div>
          </div>

          {r.strength.length > 0 && (
            <ul>
              {r.strength.map((ex, i) => (
                <li key={i}>
                  {ex.name}:{' '}
                  {ex.sets
                    .map((s) => (s.seconds != null ? `${s.seconds}秒` : `${s.weightKg}kg×${s.reps}`))
                    .join(', ')}
                  {ex.location && <span className="muted"> @{ex.location}</span>}
                </li>
              ))}
            </ul>
          )}
          {r.cardio.length > 0 && (
            <ul>
              {r.cardio.map((c, i) => (
                <li key={i}>
                  {c.kind}: {formatHMS(c.durationSec)}
                  {c.distanceKm != null ? ` / ${c.distanceKm}km` : ''}
                  {c.location && <span className="muted"> @{c.location}</span>}
                </li>
              ))}
            </ul>
          )}

          {r.events.length > 0 && (
            <ul>
              {r.events.map((e, i) => {
                const detail = [
                  e.startTime ? `${e.startTime}〜` : '',
                  formatHMS(e.durationSec),
                  e.bouts.length > 0
                    ? `(${e.bouts.map((b) => `${b.minutes}分×${b.count}本`).join(' + ')} = 実働${Math.round(boutsSec(e.bouts) / 60)}分)`
                    : '',
                  e.rpe != null ? `RPE ${e.rpe}` : '',
                  e.distanceKm != null ? `${e.distanceKm}km` : '',
                ].filter(Boolean)
                return (
                  <li key={i}>
                    {e.name}: {detail.join(' / ')}
                    {e.location && <span className="muted"> @{e.location}</span>}
                    {e.memo && <span className="muted"> — {e.memo}</span>}
                  </li>
                )
              })}
            </ul>
          )}

          <div className="record-meta">
            {recordVolume(r) > 0 && <span>ボリューム {recordVolume(r).toLocaleString()}kg</span>}
            {r.events.length > 0 && (
              <span>イベント実働 {Math.round(r.events.reduce((s, e) => s + eventActiveSec(e), 0) / 60)}分</span>
            )}
            {recordEventLoad(r) > 0 && <span>イベント負荷 {recordEventLoad(r).toLocaleString()}AU</span>}
            {r.bodyWeightKg != null && <span>体重 {r.bodyWeightKg}kg</span>}
            {r.sleepHours != null && <span>睡眠 {r.sleepHours}h</span>}
            {r.fatigue != null && <span>疲労度 {r.fatigue} ({FATIGUE_LABELS[r.fatigue]})</span>}
          </div>
          {r.memo && <p className="memo">{r.memo}</p>}
        </div>
      ))}
    </div>
  )
}

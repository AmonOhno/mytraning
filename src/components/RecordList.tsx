import type { TrainingRecord } from '../types'
import { formatHMS, recordVolume } from '../lib/stats'

interface Props {
  records: TrainingRecord[]
  onEdit: (record: TrainingRecord) => void
  onDelete: (id: string) => void
}

const FATIGUE_LABELS = ['', '絶好調', '好調', '普通', '疲れ気味', '極度の疲労']

export default function RecordList({ records, onEdit, onDelete }: Props) {
  if (records.length === 0) {
    return <p className="empty">まだ記録がありません。「入力」タブから記録を追加しましょう。</p>
  }

  return (
    <div className="record-list">
      {records.map((r) => (
        <div className="card record" key={r.id}>
          <div className="record-header">
            <strong>{r.date}</strong>
            <div className="row">
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
                </li>
              ))}
            </ul>
          )}

          <div className="record-meta">
            {recordVolume(r) > 0 && <span>ボリューム {recordVolume(r).toLocaleString()}kg</span>}
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

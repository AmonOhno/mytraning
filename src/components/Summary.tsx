import type { TrainingRecord } from '../types'
import { weeklySummary } from '../lib/stats'

export default function Summary({ records }: { records: TrainingRecord[] }) {
  const s = weeklySummary(records)
  return (
    <div className="card summary">
      <h2>直近7日間</h2>
      <div className="stats">
        <div className="stat">
          <span className="stat-value">{s.trainingDays}</span>
          <span className="stat-label">トレーニング日数</span>
        </div>
        <div className="stat">
          <span className="stat-value">{s.totalVolumeKg.toLocaleString()}</span>
          <span className="stat-label">総ボリューム (kg)</span>
        </div>
        <div className="stat">
          <span className="stat-value">{s.cardioMinutes}</span>
          <span className="stat-label">有酸素 (分)</span>
        </div>
      </div>
    </div>
  )
}

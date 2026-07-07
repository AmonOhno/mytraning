import { useEffect, useState } from 'react'
import type { CardioSession, Fatigue, StrengthExercise, TrainingRecord } from '../types'
import { newId } from '../lib/storage'

interface Props {
  editing: TrainingRecord | null
  existingDates: string[]
  exerciseNameSuggestions: string[]
  onSave: (record: TrainingRecord) => void
  onCancel: () => void
}

function todayString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const emptyExercise = (): StrengthExercise => ({ name: '', sets: [{ weightKg: 0, reps: 0 }] })
const emptyCardio = (): CardioSession => ({ kind: '', minutes: 0, distanceKm: null })

export default function RecordForm({
  editing,
  existingDates,
  exerciseNameSuggestions,
  onSave,
  onCancel,
}: Props) {
  const [date, setDate] = useState(todayString())
  const [strength, setStrength] = useState<StrengthExercise[]>([])
  const [cardio, setCardio] = useState<CardioSession[]>([])
  const [bodyWeight, setBodyWeight] = useState('')
  const [fatigue, setFatigue] = useState<Fatigue | null>(null)
  const [sleepHours, setSleepHours] = useState('')
  const [memo, setMemo] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (editing) {
      setDate(editing.date)
      setStrength(structuredClone(editing.strength))
      setCardio(structuredClone(editing.cardio))
      setBodyWeight(editing.bodyWeightKg?.toString() ?? '')
      setFatigue(editing.fatigue)
      setSleepHours(editing.sleepHours?.toString() ?? '')
      setMemo(editing.memo)
    }
  }, [editing])

  const updateExercise = (i: number, patch: Partial<StrengthExercise>) => {
    setStrength((prev) => prev.map((ex, idx) => (idx === i ? { ...ex, ...patch } : ex)))
  }

  const updateSet = (exIdx: number, setIdx: number, field: 'weightKg' | 'reps', value: string) => {
    setStrength((prev) =>
      prev.map((ex, i) =>
        i === exIdx
          ? {
              ...ex,
              sets: ex.sets.map((s, j) =>
                j === setIdx ? { ...s, [field]: Number(value) || 0 } : s,
              ),
            }
          : ex,
      ),
    )
  }

  const updateCardio = (i: number, patch: Partial<CardioSession>) => {
    setCardio((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))
  }

  const handleSubmit = () => {
    if (!date) {
      setError('日付を入力してください')
      return
    }
    const cleanStrength = strength
      .map((ex) => ({ ...ex, name: ex.name.trim(), sets: ex.sets.filter((s) => s.reps > 0) }))
      .filter((ex) => ex.name && ex.sets.length > 0)
    const cleanCardio = cardio
      .map((c) => ({ ...c, kind: c.kind.trim() }))
      .filter((c) => c.kind && c.minutes > 0)

    const hasContent =
      cleanStrength.length > 0 || cleanCardio.length > 0 || bodyWeight || sleepHours || memo.trim()
    if (!hasContent) {
      setError('記録する内容を1つ以上入力してください')
      return
    }
    if (!editing && existingDates.includes(date)) {
      if (!confirm(`${date} の記録は既にあります。別の記録として保存しますか?`)) return
    }

    const now = new Date().toISOString()
    onSave({
      id: editing?.id ?? newId(),
      date,
      strength: cleanStrength,
      cardio: cleanCardio,
      bodyWeightKg: bodyWeight ? Number(bodyWeight) : null,
      fatigue,
      sleepHours: sleepHours ? Number(sleepHours) : null,
      memo: memo.trim(),
      createdAt: editing?.createdAt ?? now,
      updatedAt: now,
    })
  }

  return (
    <div className="card form">
      <h2>{editing ? '記録を編集' : '今日の記録'}</h2>

      <label>
        日付
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>

      <section>
        <h3>筋トレ</h3>
        {strength.map((ex, i) => (
          <div className="exercise" key={i}>
            <div className="row">
              <input
                type="text"
                placeholder="種目名(例: ベンチプレス)"
                value={ex.name}
                list="exercise-names"
                onChange={(e) => updateExercise(i, { name: e.target.value })}
              />
              <button
                type="button"
                className="ghost danger"
                onClick={() => setStrength((prev) => prev.filter((_, idx) => idx !== i))}
                aria-label="種目を削除"
              >
                削除
              </button>
            </div>
            {ex.sets.map((s, j) => (
              <div className="row set-row" key={j}>
                <span className="set-label">{j + 1}セット目</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  placeholder="kg"
                  value={s.weightKg || ''}
                  onChange={(e) => updateSet(i, j, 'weightKg', e.target.value)}
                />
                <span>kg ×</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  placeholder="回"
                  value={s.reps || ''}
                  onChange={(e) => updateSet(i, j, 'reps', e.target.value)}
                />
                <span>回</span>
              </div>
            ))}
            <button
              type="button"
              className="ghost"
              onClick={() =>
                updateExercise(i, {
                  sets: [...ex.sets, { ...ex.sets[ex.sets.length - 1] }],
                })
              }
            >
              + セット追加
            </button>
          </div>
        ))}
        <datalist id="exercise-names">
          {exerciseNameSuggestions.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
        <button type="button" className="ghost" onClick={() => setStrength((p) => [...p, emptyExercise()])}>
          + 種目追加
        </button>
      </section>

      <section>
        <h3>有酸素</h3>
        {cardio.map((c, i) => (
          <div className="exercise" key={i}>
            <div className="row">
              <input
                type="text"
                placeholder="種類(例: ランニング)"
                value={c.kind}
                onChange={(e) => updateCardio(i, { kind: e.target.value })}
              />
              <button
                type="button"
                className="ghost danger"
                onClick={() => setCardio((prev) => prev.filter((_, idx) => idx !== i))}
                aria-label="有酸素を削除"
              >
                削除
              </button>
            </div>
            <div className="row set-row">
              <input
                type="number"
                inputMode="numeric"
                min="0"
                placeholder="分"
                value={c.minutes || ''}
                onChange={(e) => updateCardio(i, { minutes: Number(e.target.value) || 0 })}
              />
              <span>分</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                placeholder="km(任意)"
                value={c.distanceKm ?? ''}
                onChange={(e) =>
                  updateCardio(i, { distanceKm: e.target.value ? Number(e.target.value) : null })
                }
              />
              <span>km</span>
            </div>
          </div>
        ))}
        <button type="button" className="ghost" onClick={() => setCardio((p) => [...p, emptyCardio()])}>
          + 有酸素追加
        </button>
      </section>

      <section>
        <h3>コンディション</h3>
        <div className="row">
          <label>
            体重 (kg)
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.1"
              value={bodyWeight}
              onChange={(e) => setBodyWeight(e.target.value)}
            />
          </label>
          <label>
            睡眠 (時間)
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.5"
              value={sleepHours}
              onChange={(e) => setSleepHours(e.target.value)}
            />
          </label>
        </div>
        <label>
          疲労度
          <div className="fatigue-row" role="radiogroup" aria-label="疲労度">
            {([1, 2, 3, 4, 5] as Fatigue[]).map((f) => (
              <button
                key={f}
                type="button"
                className={fatigue === f ? 'fatigue selected' : 'fatigue'}
                aria-pressed={fatigue === f}
                onClick={() => setFatigue(fatigue === f ? null : f)}
              >
                {f}
              </button>
            ))}
          </div>
          <small>1 = 絶好調 / 5 = 極度の疲労</small>
        </label>
        <label>
          メモ
          <textarea rows={2} value={memo} onChange={(e) => setMemo(e.target.value)} />
        </label>
      </section>

      {error && <p className="error" role="alert">{error}</p>}

      <div className="row actions">
        <button type="button" className="primary" onClick={handleSubmit}>
          保存
        </button>
        {editing && (
          <button type="button" className="ghost" onClick={onCancel}>
            キャンセル
          </button>
        )}
      </div>
    </div>
  )
}

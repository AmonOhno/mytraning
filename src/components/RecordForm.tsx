import { useEffect, useState } from 'react'
import type { CardioSession, Fatigue, StrengthExercise, TrainingRecord } from '../types'
import { newId } from '../lib/storage'

interface Props {
  editing: TrainingRecord | null
  existingDates: string[]
  exerciseMaster: string[]
  onSave: (record: TrainingRecord) => void
  onCancel: () => void
}

/** 種目セレクトで「新しい種目を追加」を表す特殊値 */
const NEW_EXERCISE = '__new__'

function todayString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const emptyExercise = (): StrengthExercise => ({
  name: '',
  sets: [{ weightKg: 0, reps: 0, seconds: null }],
})
const emptyCardio = (): CardioSession => ({ kind: '', durationSec: 0, distanceKm: null })

const splitHMS = (totalSec: number) => ({
  h: Math.floor(totalSec / 3600),
  m: Math.floor((totalSec % 3600) / 60),
  s: totalSec % 60,
})

export default function RecordForm({
  editing,
  existingDates,
  exerciseMaster,
  onSave,
  onCancel,
}: Props) {
  const [date, setDate] = useState(todayString())
  const [strength, setStrength] = useState<StrengthExercise[]>([])
  /** strength と同じ並びで、名前をテキスト入力中(マスタ未登録の新種目)かどうか */
  const [customName, setCustomName] = useState<boolean[]>([])
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
      setCustomName(editing.strength.map(() => false))
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

  const addExerciseRow = () => {
    setStrength((p) => [...p, emptyExercise()])
    // マスタが空のうちは最初からテキスト入力で始める
    setCustomName((p) => [...p, exerciseMaster.length === 0])
  }

  const removeExerciseRow = (i: number) => {
    setStrength((prev) => prev.filter((_, idx) => idx !== i))
    setCustomName((prev) => prev.filter((_, idx) => idx !== i))
  }

  const setNameMode = (i: number, custom: boolean) => {
    setCustomName((prev) => prev.map((c, idx) => (idx === i ? custom : c)))
    updateExercise(i, { name: '' })
  }

  const updateSet = (
    exIdx: number,
    setIdx: number,
    field: 'weightKg' | 'reps' | 'seconds',
    value: string,
  ) => {
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

  const setSetMode = (exIdx: number, setIdx: number, mode: 'weight' | 'time') => {
    setStrength((prev) =>
      prev.map((ex, i) =>
        i === exIdx
          ? {
              ...ex,
              sets: ex.sets.map((s, j) =>
                j === setIdx
                  ? { weightKg: 0, reps: 0, seconds: mode === 'time' ? 0 : null }
                  : s,
              ),
            }
          : ex,
      ),
    )
  }

  const updateCardio = (i: number, patch: Partial<CardioSession>) => {
    setCardio((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))
  }

  const updateCardioTime = (i: number, part: 'h' | 'm' | 's', value: string) => {
    setCardio((prev) =>
      prev.map((c, idx) => {
        if (idx !== i) return c
        const parts = { ...splitHMS(c.durationSec), [part]: Number(value) || 0 }
        return { ...c, durationSec: parts.h * 3600 + parts.m * 60 + parts.s }
      }),
    )
  }

  const handleSubmit = () => {
    if (!date) {
      setError('日付を入力してください')
      return
    }
    const cleanStrength = strength
      .map((ex) => ({
        ...ex,
        name: ex.name.trim(),
        sets: ex.sets.filter((s) => (s.seconds != null ? s.seconds > 0 : s.reps > 0)),
      }))
      .filter((ex) => ex.name && ex.sets.length > 0)
    const cleanCardio = cardio
      .map((c) => ({ ...c, kind: c.kind.trim() }))
      .filter((c) => c.kind && c.durationSec > 0)

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
              {customName[i] ? (
                <>
                  <input
                    type="text"
                    placeholder="新しい種目名(例: ベンチプレス)"
                    value={ex.name}
                    onChange={(e) => updateExercise(i, { name: e.target.value })}
                  />
                  {exerciseMaster.length > 0 && (
                    <button type="button" className="ghost" onClick={() => setNameMode(i, false)}>
                      選択に戻る
                    </button>
                  )}
                </>
              ) : (
                <select
                  aria-label="種目名"
                  value={ex.name}
                  onChange={(e) => {
                    if (e.target.value === NEW_EXERCISE) {
                      setNameMode(i, true)
                    } else {
                      updateExercise(i, { name: e.target.value })
                    }
                  }}
                >
                  <option value="">種目を選択</option>
                  {exerciseMaster.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                  {ex.name && !exerciseMaster.includes(ex.name) && (
                    <option value={ex.name}>{ex.name}</option>
                  )}
                  <option value={NEW_EXERCISE}>＋ 新しい種目を追加</option>
                </select>
              )}
              <button
                type="button"
                className="ghost danger"
                onClick={() => removeExerciseRow(i)}
                aria-label="種目を削除"
              >
                削除
              </button>
            </div>
            {ex.sets.map((s, j) => (
              <div className="row set-row" key={j}>
                <span className="set-label">{j + 1}セット目</span>
                <div className="mode-toggle" role="radiogroup" aria-label="入力方式">
                  <button
                    type="button"
                    className={s.seconds == null ? 'mode selected' : 'mode'}
                    aria-pressed={s.seconds == null}
                    onClick={() => setSetMode(i, j, 'weight')}
                  >
                    kg×回
                  </button>
                  <button
                    type="button"
                    className={s.seconds != null ? 'mode selected' : 'mode'}
                    aria-pressed={s.seconds != null}
                    onClick={() => setSetMode(i, j, 'time')}
                  >
                    秒
                  </button>
                </div>
                {s.seconds == null ? (
                  <>
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
                  </>
                ) : (
                  <>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      placeholder="秒"
                      value={s.seconds || ''}
                      onChange={(e) => updateSet(i, j, 'seconds', e.target.value)}
                    />
                    <span>秒</span>
                  </>
                )}
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
        <button type="button" className="ghost" onClick={addExerciseRow}>
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
                placeholder="時"
                aria-label="時間"
                value={splitHMS(c.durationSec).h || ''}
                onChange={(e) => updateCardioTime(i, 'h', e.target.value)}
              />
              <span>:</span>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                max="59"
                placeholder="分"
                aria-label="分"
                value={splitHMS(c.durationSec).m || ''}
                onChange={(e) => updateCardioTime(i, 'm', e.target.value)}
              />
              <span>:</span>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                max="59"
                placeholder="秒"
                aria-label="秒"
                value={splitHMS(c.durationSec).s || ''}
                onChange={(e) => updateCardioTime(i, 's', e.target.value)}
              />
            </div>
            <div className="row set-row">
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

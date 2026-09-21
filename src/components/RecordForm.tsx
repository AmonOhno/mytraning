import { useEffect, useState } from 'react'
import type {
  CardioSession,
  EventSession,
  Fatigue,
  StrengthExercise,
  TrainingRecord,
} from '../types'
import { newId } from '../lib/storage'
import { boutsSec, eventActiveSec, eventLoad } from '../lib/stats'

interface Props {
  editing: TrainingRecord | null
  existingDates: string[]
  exerciseMaster: string[]
  /** 過去に入力されたイベント名(入力候補) */
  eventNames: string[]
  /** 過去に入力された場所／施設(入力候補) */
  locations: string[]
  onSave: (record: TrainingRecord) => void
  onCancel: () => void
}

/** 種目セレクトで「新しい種目を追加」を表す特殊値 */
const NEW_EXERCISE = '__new__'

/** 場所セレクトで「新しい場所を追加」を表す特殊値 */
const NEW_LOCATION = '__new_location__'

/**
 * 場所／施設をマスタから選ぶ入力欄。種目マスタと同じ選択式で、
 * 一覧にない場所は「＋ 新しい場所を追加」からテキスト入力できる。
 * 入力した場所は保存時にマスタへ自動登録される。
 */
function LocationField({
  value,
  master,
  onChange,
}: {
  value: string
  master: string[]
  onChange: (value: string) => void
}) {
  // マスタが空、または現在値が未登録なら最初からテキスト入力にする
  const [custom, setCustom] = useState(master.length === 0 || (value !== '' && !master.includes(value)))

  return (
    <div className="row set-row">
      <span className="set-label">場所／施設</span>
      {custom ? (
        <>
          <input
            type="text"
            list="location-list"
            className="wide"
            placeholder="場所／施設名(例: エニタイム〇〇店)"
            aria-label="場所／施設"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          {master.length > 0 && (
            <button
              type="button"
              className="ghost"
              onClick={() => {
                setCustom(false)
                onChange('')
              }}
            >
              一覧から選ぶ
            </button>
          )}
        </>
      ) : (
        <select
          className="wide"
          aria-label="場所／施設"
          value={value}
          onChange={(e) => {
            if (e.target.value === NEW_LOCATION) {
              setCustom(true)
              onChange('')
            } else {
              onChange(e.target.value)
            }
          }}
        >
          <option value="">場所／施設を選択(任意)</option>
          {master.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
          {value && !master.includes(value) && <option value={value}>{value}</option>}
          <option value={NEW_LOCATION}>＋ 新しい場所を追加</option>
        </select>
      )}
    </div>
  )
}

/** イベント名の初期候補(過去の入力と合わせて datalist に表示) */
const EVENT_PRESETS = [
  'サッカー',
  'フットサル',
  'バスケットボール',
  'テニス',
  'バドミントン',
  '野球',
  'バレーボール',
  '登山',
]

/** 場所／施設の初期候補(過去の入力と合わせて datalist に表示) */
const LOCATION_PRESETS = [
  '自宅',
  'ジム',
  '公園',
  'グラウンド',
  '体育館',
  '河川敷',
  'スタジオ',
]

/** RPE(主観的運動強度)の目安 */
const RPE_HINTS: Record<number, string> = {
  1: 'ごく楽',
  3: '楽',
  5: 'ややきつい',
  7: 'きつい',
  9: '非常にきつい',
  10: '限界',
}

function todayString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const emptyExercise = (): StrengthExercise => ({
  name: '',
  sets: [{ weightKg: 0, reps: 0, seconds: null }],
  location: '',
})
const emptyCardio = (): CardioSession => ({ kind: '', durationSec: 0, distanceKm: null, location: '' })
const emptyEvent = (): EventSession => ({
  name: '',
  startTime: null,
  durationSec: 0,
  bouts: [],
  rpe: null,
  distanceKm: null,
  location: '',
  memo: '',
})

const splitHMS = (totalSec: number) => ({
  h: Math.floor(totalSec / 3600),
  m: Math.floor((totalSec % 3600) / 60),
  s: totalSec % 60,
})

export default function RecordForm({
  editing,
  existingDates,
  exerciseMaster,
  eventNames,
  locations,
  onSave,
  onCancel,
}: Props) {
  const [date, setDate] = useState(todayString())
  const [strength, setStrength] = useState<StrengthExercise[]>([])
  /** strength と同じ並びで、名前をテキスト入力中(マスタ未登録の新種目)かどうか */
  const [customName, setCustomName] = useState<boolean[]>([])
  const [cardio, setCardio] = useState<CardioSession[]>([])
  const [events, setEvents] = useState<EventSession[]>([])
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
      setEvents(structuredClone(editing.events))
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

  const nameSuggestions = [...eventNames, ...EVENT_PRESETS.filter((p) => !eventNames.includes(p))]
  const locationSuggestions = [
    ...locations,
    ...LOCATION_PRESETS.filter((p) => !locations.includes(p)),
  ]

  const updateEvent = (i: number, patch: Partial<EventSession>) => {
    setEvents((prev) => prev.map((e, idx) => (idx === i ? { ...e, ...patch } : e)))
  }

  const updateEventTime = (i: number, part: 'h' | 'm' | 's', value: string) => {
    setEvents((prev) =>
      prev.map((e, idx) => {
        if (idx !== i) return e
        const parts = { ...splitHMS(e.durationSec), [part]: Number(value) || 0 }
        return { ...e, durationSec: parts.h * 3600 + parts.m * 60 + parts.s }
      }),
    )
  }

  const updateBout = (
    eventIdx: number,
    boutIdx: number,
    field: 'minutes' | 'count',
    value: string,
  ) => {
    setEvents((prev) =>
      prev.map((e, i) =>
        i === eventIdx
          ? {
              ...e,
              bouts: e.bouts.map((b, j) =>
                j === boutIdx ? { ...b, [field]: Number(value) || 0 } : b,
              ),
            }
          : e,
      ),
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
        location: ex.location.trim(),
        sets: ex.sets.filter((s) => (s.seconds != null ? s.seconds > 0 : s.reps > 0)),
      }))
      .filter((ex) => ex.name && ex.sets.length > 0)
    const cleanCardio = cardio
      .map((c) => ({ ...c, kind: c.kind.trim(), location: c.location.trim() }))
      .filter((c) => c.kind && c.durationSec > 0)
    const cleanEvents = events
      .map((e) => {
        const bouts = e.bouts.filter((b) => b.minutes > 0 && b.count > 0)
        return {
          ...e,
          name: e.name.trim(),
          location: e.location.trim(),
          memo: e.memo.trim(),
          bouts,
          // 拘束時間が未入力なら内訳の合計を実施時間として採用する
          durationSec: e.durationSec > 0 ? e.durationSec : boutsSec(bouts),
        }
      })
      .filter((e) => e.name && e.durationSec > 0)

    const hasContent =
      cleanStrength.length > 0 ||
      cleanCardio.length > 0 ||
      cleanEvents.length > 0 ||
      bodyWeight ||
      sleepHours ||
      memo.trim()
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
      events: cleanEvents,
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

      <datalist id="location-list">
        {locationSuggestions.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>

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
            <LocationField
              value={ex.location}
              master={locations}
              onChange={(v) => updateExercise(i, { location: v })}
            />
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
            <LocationField
              value={c.location}
              master={locations}
              onChange={(v) => updateCardio(i, { location: v })}
            />
          </div>
        ))}
        <button type="button" className="ghost" onClick={() => setCardio((p) => [...p, emptyCardio()])}>
          + 有酸素追加
        </button>
      </section>

      <section>
        <h3>イベント参加</h3>
        <datalist id="event-name-list">
          {nameSuggestions.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
        {events.map((e, i) => {
          const activeMin = Math.round(eventActiveSec(e) / 60)
          const load = eventLoad(e)
          return (
            <div className="exercise" key={i}>
              <div className="row">
                <input
                  type="text"
                  list="event-name-list"
                  placeholder="イベント名(例: サッカー)"
                  aria-label="イベント名"
                  value={e.name}
                  onChange={(ev) => updateEvent(i, { name: ev.target.value })}
                />
                <button
                  type="button"
                  className="ghost danger"
                  onClick={() => setEvents((prev) => prev.filter((_, idx) => idx !== i))}
                  aria-label="イベントを削除"
                >
                  削除
                </button>
              </div>

              <div className="row set-row">
                <span className="set-label">開始時刻</span>
                <input
                  type="time"
                  className="wide"
                  aria-label="開始時刻"
                  value={e.startTime ?? ''}
                  onChange={(ev) => updateEvent(i, { startTime: ev.target.value || null })}
                />
              </div>

              <LocationField
                value={e.location}
                master={locations}
                onChange={(v) => updateEvent(i, { location: v })}
              />

              <div className="row set-row time-row">
                <span className="set-label">実施時間</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  placeholder="時"
                  aria-label="実施時間(時)"
                  value={splitHMS(e.durationSec).h || ''}
                  onChange={(ev) => updateEventTime(i, 'h', ev.target.value)}
                />
                <span>:</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="59"
                  placeholder="分"
                  aria-label="実施時間(分)"
                  value={splitHMS(e.durationSec).m || ''}
                  onChange={(ev) => updateEventTime(i, 'm', ev.target.value)}
                />
                <span>:</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="59"
                  placeholder="秒"
                  aria-label="実施時間(秒)"
                  value={splitHMS(e.durationSec).s || ''}
                  onChange={(ev) => updateEventTime(i, 's', ev.target.value)}
                />
              </div>

              {e.bouts.length > 0 && (
                <div className="set-row">
                  <small>出場時間の内訳(1本あたりの時間 × 本数)</small>
                </div>
              )}
              {e.bouts.map((b, j) => (
                <div className="row set-row" key={j}>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    placeholder="分"
                    aria-label="1本あたりの時間(分)"
                    value={b.minutes || ''}
                    onChange={(ev) => updateBout(i, j, 'minutes', ev.target.value)}
                  />
                  <span>分 ×</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    placeholder="本"
                    aria-label="本数"
                    value={b.count || ''}
                    onChange={(ev) => updateBout(i, j, 'count', ev.target.value)}
                  />
                  <span>本</span>
                  <button
                    type="button"
                    className="ghost danger"
                    onClick={() =>
                      updateEvent(i, { bouts: e.bouts.filter((_, idx) => idx !== j) })
                    }
                    aria-label="内訳を削除"
                  >
                    削除
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="ghost"
                onClick={() => updateEvent(i, { bouts: [...e.bouts, { minutes: 0, count: 1 }] })}
              >
                {e.bouts.length > 0 ? '+ 内訳を追加' : '+ 出場時間の内訳(何分×何本)'}
              </button>

              <label>
                きつさ (RPE)
                <div className="rpe-row" role="radiogroup" aria-label="主観的運動強度 RPE">
                  {Array.from({ length: 10 }, (_, idx) => idx + 1).map((v) => (
                    <button
                      key={v}
                      type="button"
                      className={e.rpe === v ? 'rpe selected' : 'rpe'}
                      aria-pressed={e.rpe === v}
                      onClick={() => updateEvent(i, { rpe: e.rpe === v ? null : v })}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <small>
                  1 = ごく楽 / 5 = ややきつい / 10 = 限界
                  {e.rpe != null && RPE_HINTS[e.rpe] ? `(選択中: ${RPE_HINTS[e.rpe]})` : ''}
                </small>
              </label>

              <div className="row set-row">
                <span className="set-label">距離</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  placeholder="km(任意)"
                  aria-label="距離 (km)"
                  value={e.distanceKm ?? ''}
                  onChange={(ev) =>
                    updateEvent(i, {
                      distanceKm: ev.target.value ? Number(ev.target.value) : null,
                    })
                  }
                />
                <span>km</span>
              </div>

              <label>
                メモ(ポジション・対戦相手など)
                <input
                  type="text"
                  value={e.memo}
                  onChange={(ev) => updateEvent(i, { memo: ev.target.value })}
                />
              </label>

              {activeMin > 0 && (
                <small>
                  実働 {activeMin}分
                  {load > 0 ? ` / 推定負荷 ${load.toLocaleString()}AU(実働分 × RPE)` : ''}
                </small>
              )}
            </div>
          )
        })}
        <button type="button" className="ghost" onClick={() => setEvents((p) => [...p, emptyEvent()])}>
          + イベント追加
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

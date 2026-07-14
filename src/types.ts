export interface ExerciseSet {
  weightKg: number
  reps: number
  /** 秒数ベースのセット(プランク等)。null の場合は重さ×回数 */
  seconds: number | null
}

export interface StrengthExercise {
  name: string
  sets: ExerciseSet[]
}

export interface CardioSession {
  kind: string
  /** 合計時間(秒)。入力 UI は H:MM:SS */
  durationSec: number
  distanceKm: number | null
}

export type Fatigue = 1 | 2 | 3 | 4 | 5

export interface TrainingRecord {
  id: string
  date: string // YYYY-MM-DD
  strength: StrengthExercise[]
  cardio: CardioSession[]
  bodyWeightKg: number | null
  fatigue: Fatigue | null
  sleepHours: number | null
  memo: string
  createdAt: string
  updatedAt: string
}

export interface PeriodGoal {
  /** 総ボリューム目標 (kg)。null は未設定 */
  volumeKg: number | null
  /** 有酸素時間目標(分)。null は未設定 */
  cardioMinutes: number | null
  /** トレーニング日数目標。null は未設定(今日の目標では使わない) */
  trainingDays: number | null
}

export interface Goals {
  daily: PeriodGoal
  weekly: PeriodGoal
  monthly: PeriodGoal
}

export interface AppSettings {
  myosWebhookUrl: string
  /** 連携 API(Webhook 送信先)の Bearer トークン。空なら未認証で送信 */
  myosApiToken: string
}

export interface MyosExport {
  schemaVersion: 1
  source: 'mytraining'
  exportedAt: string
  records: TrainingRecord[]
}

export interface ExerciseSet {
  weightKg: number
  reps: number
  /** 秒数ベースのセット(プランク等)。null の場合は重さ×回数 */
  seconds: number | null
}

export interface StrengthExercise {
  name: string
  sets: ExerciseSet[]
  /** 実施した場所／施設(例: 〇〇ジム、自宅)。器具・環境が変わるため種目ごとに保持。空は未入力 */
  location: string
}

export interface CardioSession {
  kind: string
  /** 合計時間(秒)。入力 UI は H:MM:SS */
  durationSec: number
  distanceKm: number | null
  /** 実施した場所／施設(例: 河川敷、ジムのトレッドミル)。空は未入力 */
  location: string
}

/** イベント内の実施単位(例: 20分ハーフ × 2本) */
export interface EventBout {
  /** 1本あたりの時間(分) */
  minutes: number
  /** 本数 */
  count: number
}

/** サッカー等のイベント参加。強度推測のため実働時間と主観強度を持つ */
export interface EventSession {
  /** イベント名(例: サッカー) */
  name: string
  /** 開始時刻 HH:MM。null は未入力 */
  startTime: string | null
  /** 拘束時間(秒)。休憩・待機を含む全体。入力 UI は H:MM:SS */
  durationSec: number
  /** 実働の内訳(何分 × 何本)。空の場合は拘束時間を実働とみなす */
  bouts: EventBout[]
  /** 主観的運動強度 RPE(1〜10)。null は未設定 */
  rpe: number | null
  /** 移動距離 (km)。null は未入力 */
  distanceKm: number | null
  /** 実施した場所／施設(例: 〇〇グラウンド、市民体育館)。空は未入力 */
  location: string
  /** ポジション・対戦相手などの補足 */
  memo: string
}

export type Fatigue = 1 | 2 | 3 | 4 | 5

export interface TrainingRecord {
  id: string
  date: string // YYYY-MM-DD
  strength: StrengthExercise[]
  cardio: CardioSession[]
  events: EventSession[]
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

export interface ExerciseSet {
  weightKg: number
  reps: number
}

export interface StrengthExercise {
  name: string
  sets: ExerciseSet[]
}

export interface CardioSession {
  kind: string
  minutes: number
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

export interface AppSettings {
  myosWebhookUrl: string
}

export interface MyosExport {
  schemaVersion: 1
  source: 'mytraining'
  exportedAt: string
  records: TrainingRecord[]
}

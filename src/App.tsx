import { useState } from 'react'
import type { AppSettings, Goals, TrainingRecord } from './types'
import {
  addExercises,
  deleteExercise,
  deleteRecord,
  loadExercises,
  loadGoals,
  loadRecords,
  loadSettings,
  mergeRecordsForDate,
  saveGoals,
  saveRecord,
  saveSettings,
} from './lib/storage'
import RecordForm from './components/RecordForm'
import RecordList from './components/RecordList'
import Summary from './components/Summary'
import Stats from './components/Stats'
import GoalsTab from './components/Goals'
import Settings from './components/Settings'

type Tab = 'input' | 'history' | 'stats' | 'goals' | 'settings'

export default function App() {
  const [records, setRecords] = useState<TrainingRecord[]>(() => loadRecords())
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings())
  const [goals, setGoals] = useState<Goals>(() => loadGoals())
  const [exercises, setExercises] = useState<string[]>(() => loadExercises())
  const [tab, setTab] = useState<Tab>('input')
  const [editing, setEditing] = useState<TrainingRecord | null>(null)

  const handleSave = (record: TrainingRecord) => {
    setRecords(saveRecord(record))
    // 新規入力された種目名をマスタへ自動登録する
    setExercises(addExercises(record.strength.map((ex) => ex.name)))
    setEditing(null)
    setTab('history')
  }

  const handleAddExercise = (name: string) => {
    setExercises(addExercises([name]))
  }

  const handleDeleteExercise = (name: string) => {
    setExercises(deleteExercise(name))
  }

  const handleDelete = (id: string) => {
    setRecords(deleteRecord(id))
    if (editing?.id === id) setEditing(null)
  }

  const handleMergeDate = (date: string) => {
    const next = mergeRecordsForDate(date)
    setRecords(next)
    if (editing && editing.date === date && !next.some((r) => r.id === editing.id)) {
      setEditing(null)
    }
  }

  const handleEdit = (record: TrainingRecord) => {
    setEditing(record)
    setTab('input')
  }

  const handleSaveSettings = (next: AppSettings) => {
    saveSettings(next)
    setSettings(next)
  }

  const handleSaveGoals = (next: Goals) => {
    saveGoals(next)
    setGoals(next)
  }

  return (
    <div className="app">
      <header>
        <h1>MyTraining</h1>
      </header>

      <main>
        {tab === 'input' && (
          <RecordForm
            key={editing?.id ?? 'new'}
            editing={editing}
            existingDates={records.map((r) => r.date)}
            exerciseMaster={exercises}
            onSave={handleSave}
            onCancel={() => {
              setEditing(null)
              setTab('history')
            }}
          />
        )}
        {tab === 'history' && (
          <>
            <Summary records={records} />
            <RecordList
              records={records}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onMergeDate={handleMergeDate}
            />
          </>
        )}
        {tab === 'stats' && <Stats records={records} />}
        {tab === 'goals' && <GoalsTab goals={goals} records={records} onSave={handleSaveGoals} />}
        {tab === 'settings' && (
          <Settings
            settings={settings}
            records={records}
            exercises={exercises}
            onSaveSettings={handleSaveSettings}
            onAddExercise={handleAddExercise}
            onDeleteExercise={handleDeleteExercise}
          />
        )}
      </main>

      <nav className="tabbar">
        <button
          type="button"
          className={tab === 'input' ? 'active' : ''}
          onClick={() => setTab('input')}
        >
          入力
        </button>
        <button
          type="button"
          className={tab === 'history' ? 'active' : ''}
          onClick={() => setTab('history')}
        >
          履歴
        </button>
        <button
          type="button"
          className={tab === 'stats' ? 'active' : ''}
          onClick={() => setTab('stats')}
        >
          統計
        </button>
        <button
          type="button"
          className={tab === 'goals' ? 'active' : ''}
          onClick={() => setTab('goals')}
        >
          目標
        </button>
        <button
          type="button"
          className={tab === 'settings' ? 'active' : ''}
          onClick={() => setTab('settings')}
        >
          連携
        </button>
      </nav>
    </div>
  )
}

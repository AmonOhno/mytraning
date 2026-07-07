import { useState } from 'react'
import type { AppSettings, TrainingRecord } from '../types'
import { downloadExport, sendToMyos } from '../lib/myos'

interface Props {
  settings: AppSettings
  records: TrainingRecord[]
  onSaveSettings: (settings: AppSettings) => void
}

export default function Settings({ settings, records, onSaveSettings }: Props) {
  const [url, setUrl] = useState(settings.myosWebhookUrl)
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null)
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    const trimmed = url.trim()
    if (!trimmed) {
      setStatus({ ok: false, message: 'MyOS の Webhook URL を入力してください' })
      return
    }
    setSending(true)
    setStatus(null)
    const result = await sendToMyos(trimmed, records)
    setStatus(result)
    setSending(false)
  }

  return (
    <div className="card form">
      <h2>MyOS 連携</h2>

      <section>
        <h3>JSON エクスポート</h3>
        <p>全記録({records.length}件)を MyOS 連携フォーマットでダウンロードします。</p>
        <button type="button" className="primary" onClick={() => downloadExport(records)}>
          JSON をダウンロード
        </button>
      </section>

      <section>
        <h3>Webhook 送信</h3>
        <label>
          MyOS Webhook URL
          <input
            type="url"
            placeholder="https://myos.example.com/api/training"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </label>
        <div className="row actions">
          <button
            type="button"
            className="ghost"
            onClick={() => {
              onSaveSettings({ myosWebhookUrl: url.trim() })
              setStatus({ ok: true, message: 'URL を保存しました' })
            }}
          >
            URL を保存
          </button>
          <button type="button" className="primary" disabled={sending} onClick={handleSend}>
            {sending ? '送信中…' : `MyOS へ送信 (${records.length}件)`}
          </button>
        </div>
        {status && (
          <p className={status.ok ? 'success' : 'error'} role="status">
            {status.message}
          </p>
        )}
      </section>

      <section>
        <h3>データについて</h3>
        <p>
          記録はすべてこの端末内(ローカルストレージ)に保存されます。
          機種変更やブラウザ変更の前に JSON エクスポートでバックアップしてください。
        </p>
      </section>
    </div>
  )
}

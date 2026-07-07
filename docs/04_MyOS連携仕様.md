# MyOS 連携仕様書

## 1. 連携方式

MyOS 側の受け口仕様が確定していないため、汎用性の高い2方式を提供する。

| 方式 | 用途 | 状態 |
|---|---|---|
| A. JSON エクスポート | 全記録を JSON ファイルとしてダウンロードし、MyOS へ手動/バッチ取込 | 実装済み |
| B. Webhook 送信 | 設定画面で登録した MyOS のエンドポイントへ HTTP POST | 実装済み |

## 2. 連携フォーマット(共通)

```json
{
  "schemaVersion": 1,
  "source": "mytraining",
  "exportedAt": "2026-07-06T12:00:00.000Z",
  "records": [
    {
      "id": "uuid",
      "date": "2026-07-06",
      "strength": [
        {
          "name": "ベンチプレス",
          "sets": [{ "weightKg": 60, "reps": 10 }, { "weightKg": 60, "reps": 8 }]
        }
      ],
      "cardio": [{ "kind": "ランニング", "minutes": 30, "distanceKm": 5 }],
      "bodyWeightKg": 68.5,
      "fatigue": 2,
      "sleepHours": 7,
      "memo": "調子良し",
      "createdAt": "2026-07-06T11:00:00.000Z",
      "updatedAt": "2026-07-06T11:00:00.000Z"
    }
  ]
}
```

## 3. Webhook 仕様

- メソッド: `POST`
- ヘッダー: `Content-Type: application/json`
- ボディ: 上記フォーマット(全件送信)
- 成功判定: HTTP 2xx
- 失敗時: アプリ側でエラーメッセージ表示。リトライは手動(再送ボタン)

### MyOS 側に求める受け口(推奨)
- HTTPS の POST エンドポイント1つ
- `id` をキーに upsert(同一 id の再送で重複しないこと)
- CORS: Web 版から送信する場合、アプリのオリジンを許可すること

## 4. 拡張余地

- 差分送信(前回送信以降の updatedAt でフィルタ)
- 認証トークンヘッダー(MyOS 側仕様確定後に `Authorization: Bearer` を追加)
- スキーマ変更時は `schemaVersion` をインクリメントし、変換仕様をこの文書に追記

# MyOS 連携仕様書

## 1. 連携方式

| 方式 | 用途 | 状態 |
|---|---|---|
| A. JSON エクスポート | 全記録を JSON ファイルとしてダウンロードし、MyOS へ手動/バッチ取込 | 実装済み |
| B. Webhook 送信 | 設定画面で登録したエンドポイントへ HTTP POST | 実装済み |
| C. 参照 API | MyOS がポーリングで参照する読み取り専用 REST API(`api/`) | 実装済み(デプロイは手動) |

MyOS 側の受け口仕様は [my-os#14](https://github.com/AmonOhno/my-os/pull/14) で確定した(読み取り専用ポーリング型)。方式 C がその受け口に対応し、方式 B は方式 C へのデータ送り込みに使う。

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
- ヘッダー: `Content-Type: application/json`。連携タブで API トークンを設定した場合は `Authorization: Bearer <トークン>` を付与
- ボディ: 上記フォーマット(全件送信)
- 成功判定: HTTP 2xx
- 失敗時: アプリ側でエラーメッセージ表示。リトライは手動(再送ボタン)

### MyOS 側に求める受け口(推奨)
- HTTPS の POST エンドポイント1つ
- `id` をキーに upsert(同一 id の再送で重複しないこと)
- CORS: Web 版から送信する場合、アプリのオリジンを許可すること

## 4. 参照 API 仕様(方式 C)

アプリ本体はサーバレス(localStorage のみ)のため、MyOS がポーリングする API は
`api/` の Cloudflare Worker(無料枠)として提供する。データフロー:

```
MyTraining アプリ ──(方式B: Webhook POST /records)──▶ Worker + KV ──(GET /summary, /sessions)──▶ MyOS
```

### 4.1 認証

全エンドポイントで `Authorization: Bearer <API_TOKEN>` を必須とする。
トークンは `npx wrangler secret put API_TOKEN` で Worker に設定し、
同じ値を MyTraining の連携タブ(送信用)と MyOS の設定画面(参照用)に登録する。

### 4.2 エンドポイント

#### POST /records(アプリ → Worker)

- ボディ: 2章の連携フォーマット(全件送信)。KV に上書き保存(常に最新全件)
- レスポンス: `{ "ok": true, "count": 42 }`

#### GET /summary?month=YYYY-MM(MyOS → Worker)

```json
{ "month": "2026-07", "sessions": 12, "totalMinutes": 540 }
```

#### GET /sessions?range=YYYY-MM-DD..YYYY-MM-DD(MyOS → Worker)

```json
{ "sessions": [{ "date": "2026-07-05", "title": "ベンチプレス・ランニング", "minutes": 60 }] }
```

### 4.3 導出ルール

- セッション: 筋トレまたは有酸素の実績がある記録1件を1セッションと数える
- minutes: 有酸素の合計時間 + 秒数ベースのセット(プランク等)を分に換算(重量×回数のセットは時間を持たないため含めない)
- title: 筋トレ種目名と有酸素種別を「・」で連結(重複除去)。いずれもなければ「トレーニング」

### 4.4 CORS

- `https://*.github.io`(MyOS の GitHub Pages)、`http://localhost:*`(開発)、`capacitor://localhost`(iOS アプリ)を許可
- MyOS の iOS 版は CapacitorHttp 経由のため CORS の影響を受けない

### 4.5 デプロイ手順

```bash
cd api
npx wrangler kv namespace create TRAINING_KV   # 出力された id を wrangler.toml に反映
npx wrangler secret put API_TOKEN              # 任意の長いランダム文字列
npx wrangler deploy
```

デプロイ後、連携タブの Webhook URL に `https://<worker名>.<account>.workers.dev/records` と
API トークンを設定して「MyOS へ送信」すると、MyOS から参照可能になる。

## 5. 拡張余地

- 差分送信(前回送信以降の updatedAt でフィルタ)
- スキーマ変更時は `schemaVersion` をインクリメントし、変換仕様をこの文書に追記

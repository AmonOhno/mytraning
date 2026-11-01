# MyTraining アーキテクチャ(C4 モデル)

本書は C4 モデル(System Context → Container → Component)に沿って MyTraining の構成を示す。
記述はリポジトリ内のコード・設定ファイルに基づく。コードから確認できない点は「未確認」と明記する。
技術選定の理由や代替案は [02_アーキテクチャ設計.md](02_アーキテクチャ設計.md)、データ構造は [03_データモデル.md](03_データモデル.md)、
連携仕様は [04_MyOS連携仕様.md](04_MyOS連携仕様.md) を参照。

## 1. 概要

### 目的

日々のトレーニング(筋トレ・有酸素・イベント参加・体重・疲労度・睡眠・メモ)を記録・集計し、
自己管理システム **MyOS** へ連携して自己理解に役立てる。

### 主な利用者

| 利用者 | 説明 |
|---|---|
| トレーニー(本人) | Web ブラウザまたは iOS アプリで記録を入力・閲覧し、目標を管理する。個人利用を想定(マルチユーザー・ログイン機能なし) |
| MyOS | 外部の個人用システム。参照 API をポーリングしてトレーニング実績を取り込む |

### 技術スタック

| 領域 | 技術 | 根拠 |
|---|---|---|
| 言語 | TypeScript ~6.0 | `package.json` |
| UI | React 19(関数コンポーネント + `useState`、外部状態管理ライブラリなし) | `package.json`, `src/App.tsx` |
| ビルド | Vite 8 + `@vitejs/plugin-react` | `vite.config.ts` |
| リント | oxlint | `.oxlintrc.json` |
| iOS | Capacitor 8(`@capacitor/ios`、Swift Package Manager、iOS 15+) | `capacitor.config.ts`, `ios/App/CapApp-SPM/Package.swift` |
| 永続化 | ブラウザ / WKWebView の localStorage | `src/lib/storage.ts` |
| 連携 API | Cloudflare Workers + Workers KV(`wrangler`) | `api/worker.ts`, `api/wrangler.toml` |
| グラフ | 外部チャートライブラリなし(依存定義に存在しない) | `package.json` |

### 存在しないもの(確認結果)

- 認証基盤・ユーザー管理: なし(Worker のみ共有 Bearer トークンで保護)
- RDB / 本アプリ専用のバックエンドサーバ: なし
- Dockerfile / IaC(Terraform 等): なし(Worker は `wrangler.toml` のみ)
- CI 設定(`.github/workflows` 等): なし
- Web 版のホスティング先: 設計書では GitHub Pages / Cloudflare Pages 等の静的ホスティングを想定しているが、デプロイ設定はリポジトリに無く **未確認**
- MyOS 側の実装: 別リポジトリ(AmonOhno/my-os)のため **未確認**
- `api/wrangler.toml` の KV namespace ID はプレースホルダ(`REPLACE_WITH_YOUR_KV_NAMESPACE_ID`)のままで、実際のデプロイ状況は **未確認**

## 2. Level 1: System Context 図

```mermaid
C4Context
  title System Context - MyTraining

  Person(user, "トレーニー", "日々のトレーニングを記録し、集計・目標達成度を確認する本人")

  System(mytraining, "MyTraining", "トレーニング記録アプリ(Web / iOS 同一コードベース)。データは端末ローカル保存")

  System_Ext(myos, "MyOS", "外部の個人用システム。参照 API をポーリングしてトレーニング実績を取り込む")
  System_Ext(cloudflare, "Cloudflare Workers / KV", "MyOS 連携用 参照 API の実行基盤(無料枠)")
  System_Ext(appstore, "Apple App Store", "iOS アプリの配信")

  Rel(user, mytraining, "記録の入力・閲覧・目標設定", "Web ブラウザ / iOS アプリ")
  Rel(mytraining, cloudflare, "全記録を Webhook 送信", "HTTPS POST /records")
  Rel(myos, cloudflare, "サマリー・セッションを参照", "HTTPS GET /summary, /sessions")
  Rel(mytraining, myos, "JSON エクスポートファイルを手動取込", "ファイル")
  Rel(appstore, user, "iOS アプリを配信")

  UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

| 名前 | 種別 | 技術 | 責務 |
|---|---|---|---|
| トレーニー | Person | — | 記録の入力・編集・削除、統計・目標の閲覧、MyOS 連携の設定・実行 |
| MyTraining | Software System(本システム) | React + TypeScript / Capacitor / Cloudflare Worker | トレーニング記録の管理・集計、MyOS 向けデータ提供 |
| MyOS | External System | 未確認(別リポジトリ。CORS 設定から GitHub Pages 配信と推定) | 参照 API からトレーニング実績を取り込む |
| Cloudflare Workers / KV | External System(実行基盤) | Cloudflare Workers, Workers KV | 参照 API(`api/`)のホスティングとデータ保管 |
| Apple App Store | External System | App Store Connect | iOS 版の配布(手順は [05_iOS_AppStore配信手順.md](05_iOS_AppStore配信手順.md)) |

> Webhook 送信先 URL は連携タブで任意に設定できるため、Worker 以外(MyOS 側の任意の受け口)へ直接 POST することも可能。

## 3. Level 2: Container 図

```mermaid
C4Container
  title Container - MyTraining

  Person(user, "トレーニー", "本人")
  System_Ext(myos, "MyOS", "外部の個人用システム")

  System_Boundary(sys, "MyTraining") {
    Container(spa, "Web アプリ (SPA)", "React 19, TypeScript, Vite", "記録入力・一覧・統計・目標・連携設定の UI とドメインロジック")
    Container(ios, "iOS アプリ", "Capacitor 8, Swift, WKWebView", "ビルド済み SPA (dist/) を同梱して表示するネイティブシェル")
    ContainerDb(ls, "localStorage", "Web Storage (JSON)", "記録・設定・目標・種目マスタ・場所マスタを端末ローカルに保存")
    Container(api, "参照 API", "Cloudflare Worker, TypeScript", "Webhook 受信と MyOS 向け集計 API。Bearer トークン認証・CORS 制御")
    ContainerDb(kv, "TRAINING_KV", "Cloudflare Workers KV", "最新の全記録 (MyosExport) を key=records で保持")
  }

  Rel(user, spa, "利用", "HTTPS / ブラウザ")
  Rel(user, ios, "利用", "iPhone")
  Rel(ios, spa, "同梱して WebView で実行", "capacitor://localhost")
  Rel(spa, ls, "読み書き", "localStorage API")
  Rel(spa, api, "全記録を送信", "HTTPS POST /records, Bearer")
  Rel(api, kv, "保存・読込", "KV get/put")
  Rel(myos, api, "参照", "HTTPS GET /summary, /sessions, Bearer")

  UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

| 名前 | 種別 | 技術 | 責務 |
|---|---|---|---|
| Web アプリ (SPA) | Container(フロントエンド) | React 19, TypeScript, Vite 8 | 全画面 UI、集計ロジック、localStorage 永続化、JSON エクスポート、Webhook 送信。エントリポイントは `index.html` → `src/main.tsx` → `src/App.tsx` |
| iOS アプリ | Container(ネイティブシェル) | Capacitor 8(appId `com.amon.mytraining`)、Swift(`AppDelegate.swift`)、SPM | `dist/` を同梱し WKWebView で SPA を実行。Xcode ビルド時に `npm run build` + `npx cap copy ios` を実行し、Release ではビルド番号(`CFBundleVersion`)を日時で自動付与 |
| localStorage | Container(データストア) | Web Storage | キー `mytraining.records` / `.settings` / `.goals` / `.exercises` / `.locations` に JSON で保存。端末ごとに独立(同期なし) |
| 参照 API | Container(API) | Cloudflare Worker(`api/worker.ts`) | `POST /records`(全件上書き保存)、`GET /summary?month=`、`GET /sessions?range=`。全エンドポイントで `Authorization: Bearer <API_TOKEN>` 必須。CORS は `*.github.io` / `localhost` / `capacitor://localhost` を許可 |
| TRAINING_KV | Container(データストア) | Workers KV | 直近に受信した `MyosExport` 全体を単一キー `records` に保存 |

## 4. Level 3: Component 図

中心コンテナである **Web アプリ (SPA)** と、MyOS 連携の要である **参照 API** の内部構成を示す。

### 4.1 Web アプリ (SPA)

```mermaid
C4Component
  title Component - Web アプリ (SPA)

  ContainerDb(ls, "localStorage", "Web Storage", "端末ローカル保存")
  Container_Ext(api, "参照 API / Webhook 送信先", "Cloudflare Worker 等", "連携データの受け口")

  Container_Boundary(spa, "Web アプリ (SPA)") {
    Component(app, "App", "src/App.tsx", "状態の保持 (useState) とタブ切替。各画面へ props とハンドラを配布")
    Component(form, "RecordForm", "components/RecordForm.tsx", "筋トレ・有酸素・イベント等の入力・編集")
    Component(list, "RecordList / Summary", "components/RecordList.tsx, Summary.tsx", "記録一覧・同日統合・削除、直近7日サマリー")
    Component(statsui, "Stats", "components/Stats.tsx", "日別・週別・種目別の推移表示")
    Component(goalsui, "Goals", "components/Goals.tsx", "今日・今週・今月の目標設定と達成度履歴")
    Component(settingsui, "Settings", "components/Settings.tsx", "種目/場所マスタ管理、エクスポート、Webhook 設定・送信")
    Component(storage, "storage", "lib/storage.ts", "localStorage 永続化層 (CRUD・マスタ・設定・目標)")
    Component(stats, "stats", "lib/stats.ts", "ボリューム・実働時間・負荷 (AU) 等の集計 (純粋関数)")
    Component(myoslib, "myos", "lib/myos.ts", "MyosExport 生成、JSON ダウンロード、Webhook 送信 (fetch)")
    Component(types, "types", "src/types.ts", "ドメイン型定義 (TrainingRecord, Goals, AppSettings, MyosExport)")
  }

  Rel(app, form, "props")
  Rel(app, list, "props")
  Rel(app, statsui, "props")
  Rel(app, goalsui, "props")
  Rel(app, settingsui, "props")
  Rel(app, storage, "load/save")
  Rel(storage, ls, "getItem/setItem")
  Rel(list, stats, "集計")
  Rel(statsui, stats, "集計")
  Rel(goalsui, stats, "集計")
  Rel(settingsui, myoslib, "エクスポート/送信")
  Rel(myoslib, api, "POST", "HTTPS")

  UpdateLayoutConfig($c4ShapeInRow="4", $c4BoundaryInRow="1")
```

| 名前 | 種別 | 技術 | 責務 |
|---|---|---|---|
| App | Component(ルート) | `src/App.tsx` | records / settings / goals / exercises / locations を `useState` で保持。5 タブ(入力・履歴・統計・目標・連携)の切替。保存時に種目・場所マスタへ自動登録 |
| RecordForm | Component(UI) | `src/components/RecordForm.tsx` | 記録の入力・編集フォーム。ID 採番に `storage.newId`、イベント実働時間・負荷に `stats` を利用 |
| RecordList / Summary | Component(UI) | `src/components/RecordList.tsx`, `Summary.tsx` | 記録一覧(編集・削除・同日統合)、直近7日間サマリー |
| Stats | Component(UI) | `src/components/Stats.tsx` | 日別指標・週別ボリューム・種目別最大値・イベント負荷の推移表示 |
| Goals | Component(UI) | `src/components/Goals.tsx` | 期間別目標の設定、達成度と履歴(直近7日 / 8週 / 6ヶ月) |
| Settings | Component(UI) | `src/components/Settings.tsx` | 種目・場所マスタ管理、JSON エクスポート、Webhook URL / API トークン設定と送信 |
| storage | Component(永続化層) | `src/lib/storage.ts` | localStorage の読み書き、記録の upsert / 削除 / 同日統合、マスタ・設定・目標の保存 |
| stats | Component(ドメインロジック) | `src/lib/stats.ts` | 集計関数群(`recordVolume`, `eventLoad`, `rangeSummary`, `goalPeriodRange` 等) |
| myos | Component(連携) | `src/lib/myos.ts` | `MyosExport`(schemaVersion 1)の生成、Blob ダウンロード、`fetch` による Webhook POST |
| types | Component(型) | `src/types.ts` | ドメイン型。`api/worker.ts` からも参照され、アプリと API で型を共有 |

依存方向は `components → lib → types`。UI から localStorage へ直接アクセスせず、`App` 経由で `storage` を呼ぶ(`RecordForm` の `newId` のみ例外的に直接 import)。

### 4.2 参照 API(Cloudflare Worker)

```mermaid
C4Component
  title Component - 参照 API (api/worker.ts)

  Container_Ext(spa, "Web アプリ (SPA)", "React", "Webhook 送信元")
  System_Ext(myos, "MyOS", "参照元")
  ContainerDb(kv, "TRAINING_KV", "Workers KV", "key=records")

  Container_Boundary(api, "参照 API") {
    Component(router, "fetch ハンドラ", "export default fetch", "OPTIONS 応答・認証チェック・ルーティング")
    Component(cors, "corsHeaders", "関数", "Origin 許可判定と CORS ヘッダ生成")
    Component(auth, "isAuthorized", "関数", "Bearer API_TOKEN の照合 (Worker Secret)")
    Component(post, "handlePostRecords", "関数", "MyosExport を検証し KV に全件上書き")
    Component(query, "handleSummary / handleSessions", "関数", "月間サマリー・期間内セッションを返す")
    Component(derive, "集計ヘルパー", "isSession, sessionMinutes, sessionTitle", "記録からセッション数・分・タイトルを導出")
  }

  Rel(spa, router, "POST /records", "HTTPS")
  Rel(myos, router, "GET /summary, /sessions", "HTTPS")
  Rel(router, cors, "使用")
  Rel(router, auth, "使用")
  Rel(router, post, "振り分け")
  Rel(router, query, "振り分け")
  Rel(query, derive, "使用")
  Rel(post, kv, "put")
  Rel(query, kv, "get")

  UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

| 名前 | 種別 | 技術 | 責務 |
|---|---|---|---|
| fetch ハンドラ | Component(エントリポイント) | Workers `fetch` | CORS プリフライト応答、認証失敗時 401、パス/メソッドでのルーティング、該当なし 404 |
| corsHeaders | Component | TypeScript 関数 | `https://*.github.io` / `http://localhost:*` / `capacitor://localhost` のみ許可 |
| isAuthorized | Component | TypeScript 関数 | `Authorization: Bearer <API_TOKEN>` を照合。`API_TOKEN` 未設定時は常に拒否 |
| handlePostRecords | Component | TypeScript 関数 | `source === 'mytraining'` と `records` 配列を検証し、KV に上書き保存 |
| handleSummary / handleSessions | Component | TypeScript 関数 | `month=YYYY-MM` / `range=YYYY-MM-DD..YYYY-MM-DD` を検証し集計結果を返す |
| 集計ヘルパー | Component | TypeScript 関数 | 旧形式データ(`minutes`、`events` なし)にも耐える導出ロジック |

## 5. 主要なデータフロー

### 5.1 記録の入力と保存

```mermaid
sequenceDiagram
  actor U as トレーニー
  participant F as RecordForm
  participant A as App
  participant S as lib/storage
  participant L as localStorage

  U->>F: 記録を入力して保存
  F->>A: onSave(record)
  A->>S: saveRecord(record)
  S->>L: setItem("mytraining.records", JSON)
  S-->>A: 更新後の records
  A->>S: addExercises() / addLocations()
  S->>L: setItem("mytraining.exercises" / "mytraining.locations")
  A-->>U: 履歴タブへ遷移し一覧・サマリーを再描画
```

### 5.2 MyOS 連携(Webhook 送信 → MyOS が参照)

```mermaid
sequenceDiagram
  actor U as トレーニー
  participant ST as Settings
  participant M as lib/myos
  participant W as 参照 API (Worker)
  participant KV as TRAINING_KV
  participant O as MyOS

  U->>ST: 「送信」操作
  ST->>M: sendToMyos(url, records, token)
  M->>W: POST /records (MyosExport 全件, Bearer)
  W->>W: CORS・認証・ペイロード検証
  W->>KV: put("records", payload)
  W-->>M: 200 { ok, count }
  M-->>ST: 送信結果メッセージ
  Note over O,W: 以降、MyOS が任意のタイミングでポーリング
  O->>W: GET /summary?month=YYYY-MM (Bearer)
  W->>KV: get("records")
  W-->>O: { month, sessions, totalMinutes }
  O->>W: GET /sessions?range=A..B (Bearer)
  W-->>O: { sessions: [{ date, title, minutes }] }
```

### 5.3 iOS ビルドと配信

```mermaid
sequenceDiagram
  actor D as 開発者
  participant X as Xcode
  participant N as npm / Vite
  participant C as Capacitor CLI
  participant AS as App Store Connect

  D->>X: Build / Archive
  X->>N: Run Script: npm run build (tsc -b && vite build)
  N-->>X: dist/
  X->>C: npx cap copy ios (dist/ → iOS プロジェクト)
  X->>X: Release 時 CFBundleVersion = yyMMddHHmm
  D->>AS: Archive をアップロードして審査提出
```

## 6. ディレクトリ構成

```
mytraning/
├── index.html              # SPA の HTML エントリ(/src/main.tsx を読み込む)
├── package.json            # 依存・npm スクリプト(dev / build / lint / preview)
├── vite.config.ts          # Vite 設定(React プラグイン)
├── tsconfig*.json          # TypeScript 設定(app / node のプロジェクト参照)
├── .oxlintrc.json          # oxlint 設定
├── capacitor.config.ts     # Capacitor 設定(appId, webDir=dist)
├── src/                    # Web アプリ本体(Web / iOS 共通)
│   ├── main.tsx            # React のマウント
│   ├── App.tsx             # ルート: 状態保持・タブ切替
│   ├── index.css           # 全体スタイル
│   ├── types.ts            # ドメイン型(api/ からも参照)
│   ├── components/         # 画面コンポーネント(RecordForm, RecordList, Summary, Stats, Goals, Settings)
│   └── lib/                # ドメインロジック(storage: 永続化 / stats: 集計 / myos: 連携)
├── api/                    # MyOS 連携用 参照 API(Cloudflare Worker)
│   ├── worker.ts           # エンドポイント実装
│   ├── wrangler.toml       # Worker 設定・KV バインディング
│   └── tsconfig.json
├── ios/                    # Capacitor が生成した iOS(Xcode)プロジェクト
│   ├── App/App/            # AppDelegate.swift, Info.plist, Storyboard
│   ├── App/App.xcodeproj/  # Xcode プロジェクト(Web 再ビルド・ビルド番号付与の Run Script を含む)
│   └── App/CapApp-SPM/     # Capacitor 依存の Swift Package(CLI 管理)
└── docs/                   # 要件定義・設計・データモデル・連携仕様・配信手順・本書
```

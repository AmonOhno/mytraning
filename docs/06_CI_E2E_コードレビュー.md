# CI（E2E テスト・Claude Code Review）

PR の作成・更新時に GitHub Actions で次の 2 つのワークフローが動く。

| ワークフロー | ファイル | 内容 |
|---|---|---|
| E2E | [.github/workflows/e2e.yml](../.github/workflows/e2e.yml) | `npm run build`（型チェック + 本番ビルド）→ `npm run lint`（oxlint）→ Playwright E2E。**1 件でも失敗すればジョブは失敗（NG）** |
| Claude Code Review | [.github/workflows/claude-code-review.yml](../.github/workflows/claude-code-review.yml) | Claude Code 公式 `code-review` プラグインで PR をレビューし、指摘を PR にコメントする |

- E2E は `opened` / `synchronize` / `reopened` / `ready_for_review` と main への push で実行。
- Code Review はドラフト PR とフォークからの PR（Secrets を参照できない）では実行しない。

## E2E テスト

- フレームワーク: Playwright（`@playwright/test`）。設定は [playwright.config.ts](../playwright.config.ts)、テストは [e2e/](../e2e/)。
- 本番ビルドを `vite preview`（port 4173）で配信し、モバイル画面幅（Pixel 7 相当、Chromium）で操作する。
- **リトライなし**（設定・CI ともに `--retries=0`）。リトライで通った flaky も合格扱いにしない。
  テストのスキップ・無効化（`test.skip` / `test.only` 等）で緑にすることは禁止（CI では `forbidOnly` で `.only` を検出して失敗させる）。
- 各テストは新しいブラウザコンテキスト（空の localStorage）で始まる。
- 外部通信は MyOS Webhook 送信のみ。`page.route` でモックし、モックしていない外部通信は遮断する。

### 対象のフロー

1. 初期表示（入力画面・タブバー）
2. 空入力で保存した際のバリデーションエラー
3. 筋トレ記録の保存 → 履歴表示 → リロード後の永続化 → 統計反映 → 種目マスタ自動登録
4. 記録の編集・削除
5. 統計・目標・連携タブの表示（記録なし）
6. Webhook 送信（モック API への POST 内容・Bearer トークン・成功表示）
7. Webhook 送信失敗時のエラー表示

### 対象外とするもの

| 対象 | 理由 |
|---|---|
| iOS ネイティブ（`ios/`、Capacitor） | Xcode / macOS ランナーと署名が必要で ubuntu の CI では動かせない。Web 部分は同一コードなので Web の E2E で担保する |
| 参照 API（`api/`、Cloudflare Worker + KV） | Web アプリからは呼び出されず（MyOS がポーリングする API）、画面フローに関与しない。Wrangler / KV の環境が必要 |
| 実際の MyOS への Webhook 送信 | 外部サービスに依存し不安定・副作用があるため、`page.route` のモックで代替 |
| JSON エクスポートのファイル内容 | ダウンロード処理はブラウザ依存で、画面フローの主要部分ではないためスモークでは扱わない |

### ローカル実行

```bash
npm ci
npx playwright install chromium        # 初回のみ
CI=1 npm run test:e2e -- --retries=0  # CI と同条件
```

`CI` 未設定時は起動中の preview サーバ（port 4173）があれば再利用する。
失敗時のレポートは `playwright-report/`（`npx playwright show-report`）、トレースは `test-results/` に出力される。CI ではアーティファクト `playwright-report` として保存される。

## 手動で行う設定

### 1. Claude GitHub App のインストール

https://github.com/apps/claude からリポジトリ `AmonOhno/mytraning` にインストールする。
（Claude Code CLI で `/install-github-app` を実行しても設定できる）

### 2. Secrets の登録

リポジトリの **Settings → Secrets and variables → Actions → New repository secret** で、次のどちらかを登録する。

| Secret | 取得方法 |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic Console（https://console.anthropic.com/）で発行した API キー（従量課金） |
| `CLAUDE_CODE_OAUTH_TOKEN` | Claude Pro / Max のサブスクリプションを使う場合。ローカルで `claude setup-token` を実行して発行 |

E2E ワークフローは Secrets 不要。

### 3. ブランチ保護で E2E を必須チェックにする

1. **Settings → Branches → Add branch ruleset**（または Branch protection rules → Add rule）で対象を `main` にする。
2. **Require a pull request before merging** を有効にする。
3. **Require status checks to pass** を有効にし、チェック名 **`test`**（E2E ワークフローのジョブ。表示は `E2E / test`）を追加する。
   一度 PR でワークフローを実行するとチェック名が候補に表示される。
4. 必要に応じて **Require branches to be up to date before merging** を有効にする。
5. 保存する。

Claude Code Review はレビューコメントを付けるもので合否判定ではないため、必須チェックにはしない（Secrets 未設定・API 障害でマージできなくなるのを避ける）。

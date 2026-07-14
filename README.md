# MyTraining

日々のトレーニング記録を入力・蓄積し、MyOS へ連携して自己理解に役立てるアプリ。
Web(TypeScript)と iOS(Capacitor / App Store 配信用)の同一コードベース構成。

## ドキュメント

| 文書 | 内容 |
|---|---|
| [docs/01_要件定義.md](docs/01_要件定義.md) | 目的・スコープ・機能/非機能要件 |
| [docs/02_アーキテクチャ設計.md](docs/02_アーキテクチャ設計.md) | 技術選定・レイヤ構成・データフロー |
| [docs/03_データモデル.md](docs/03_データモデル.md) | エンティティ定義・保存形式 |
| [docs/04_MyOS連携仕様.md](docs/04_MyOS連携仕様.md) | 連携フォーマット・Webhook 仕様 |
| [docs/05_iOS_AppStore配信手順.md](docs/05_iOS_AppStore配信手順.md) | Xcode でのビルド・審査提出手順 |

## 機能

- 筋トレ(種目・セットごとの重量/回数)・有酸素・体重・疲労度・睡眠・メモの記録
- 記録の一覧・編集・削除、直近7日間サマリー(日数・総ボリューム・有酸素時間)
- 種目マスタ: トレーニング種目を登録して選択式で入力(既存記録から自動生成・連携タブで管理)
- MyOS 連携: JSON エクスポート / Webhook 送信(連携タブで設定)/ 参照 API(`api/`、MyOS がポーリング)
- 目標設定: 今日・今週・今月の目標(総ボリューム・有酸素時間・トレーニング日数)と達成度の閲覧(目標タブ)
- データはすべて端末ローカル保存(サーバ不要・コスト無料)

## 開発

```bash
npm install
npm run dev      # 開発サーバ (http://localhost:5173)
npm run build    # 型チェック + 本番ビルド (dist/)
npm run lint     # リント
```

## iOS(App Store 配信)

```bash
npm run build
npx cap sync ios   # dist/ を ios/ プロジェクトへ反映
npx cap open ios   # Xcode で開き、署名して Archive → App Store Connect へ
```

詳細は [docs/05_iOS_AppStore配信手順.md](docs/05_iOS_AppStore配信手順.md) を参照。
App Store 配信には Apple Developer Program(年 $99)が必要です(アプリ自体の開発・運用は無料)。

## 技術スタック

- React 19 + Vite + TypeScript
- Capacitor(iOS ラッパー、Swift Package Manager)
- MyOS 参照 API: Cloudflare Worker + KV(`api/`、無料枠。デプロイ手順は [docs/04_MyOS連携仕様.md](docs/04_MyOS連携仕様.md))
- 保存: localStorage(`mytraining.records` / `mytraining.settings` / `mytraining.exercises` / `mytraining.goals`)

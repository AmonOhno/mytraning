# MyTraining 開発ルール

## プロジェクト概要

トレーニング記録アプリ。Web(React + TypeScript + Vite)と iOS(Capacitor)の同一コードベース。
データはすべて端末の localStorage に保存。詳細は [README.md](README.md) と [docs/](docs/) を参照。

## 開発フロー(Issue 駆動開発)

このリポジトリは **Issue 駆動開発** で運用する。以下のルールを必ず守ること。

### 1. 必ず GitHub Issue から始める

- ソース修正・機能追加に着手する前に、対応する GitHub Issue が存在することを確認する。
- **Issue が存在しない場合は、先に `gh issue create` で Issue を作成してから**ソース修正に進む。
- Issue には背景・目的・変更内容の概要を記載する。

### 2. 修正は必ず最新の main ブランチから開始する

作業ブランチを切る前に、必ず main を最新化する。

```bash
git checkout main
git pull origin main
git checkout -b feature/issue-<Issue番号>-<短い説明>
```

### 3. ブランチ命名規則

- 機能追加: `feature/issue-<Issue番号>-<短い説明>`
- バグ修正: `fix/issue-<Issue番号>-<短い説明>`

### 4. Pull Request とマージ

- main への直接コミットはしない。必ず Pull Request 経由でマージする。
- PR 本文に `Closes #<Issue番号>` を含め、マージ時に Issue が自動クローズされるようにする。
- 1 Issue = 1 ブランチ = 1 PR を原則とする。

## 検証

PR 作成前に必ず以下を通すこと。

```bash
npm run build   # 型チェック + 本番ビルド
npm run lint    # リント
```

## iOS 反映

Web 側の修正を iOS に反映する場合:

```bash
npm run build
npx cap sync ios
```

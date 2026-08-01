# iOS App Store 配信手順

Capacitor により Web 版と同一コードベースから iOS アプリを生成する。

## 0. 前提

| 項目 | 内容 |
|---|---|
| macOS + Xcode | 最新版 Xcode(App Store 提出要件) |
| CocoaPods | `sudo gem install cocoapods` または Homebrew |
| Apple Developer Program | 年間 $99(App Store 配信に必須。開発機での実機テストのみなら無料アカウント可) |

## 1. iOS プロジェクト生成(初回のみ)

```bash
npm run build
npx cap add ios     # ios/ ディレクトリが生成される(本リポジトリでは生成済みの場合スキップ)
npm run ios:sync
```

## 2. アプリ情報の設定

- Bundle ID: `com.amon.mytraining`(App Store Connect 登録時に一意である必要あり。適宜変更)
- 表示名: MyTraining
- `ios/App/App/Info.plist` でバージョン(`CFBundleShortVersionString`)とビルド番号を管理

## 3. アイコン・起動画面

- `ios/App/App/Assets.xcassets/AppIcon.appiconset` に 1024×1024 のアイコンを配置
  (Xcode 14 以降は 1024px 1枚で全サイズ自動生成)

## 4. ビルドと提出

```bash
npm run ios:open    # ビルド + sync してから Xcode が開く
```

Xcode 上で:
1. Signing & Capabilities → 自分の Team を選択(自動署名)
2. デバイスを「Any iOS Device (arm64)」に設定
3. Product → Archive
4. Organizer → Distribute App → App Store Connect → Upload
5. App Store Connect(https://appstoreconnect.apple.com)でアプリ情報・スクリーンショット・
   プライバシー情報を入力して審査提出

## 5. 審査時の注意(本アプリ固有)

- **データ収集なし**: 全データ端末内保存のため、プライバシー「データを収集しない」を選択可能
- **最小機能ガイドライン(4.2)対策**: 単なる Web ラッパーと判定されないよう、
  オフライン完結動作・記録機能が実機で動作することを審査ノートに明記
- Webhook 送信はユーザー自身が設定した任意機能である旨を説明

## 6. 更新フロー

```bash
npm run ios:open
# Xcode でビルド番号を上げて Archive → Upload
```

## 7. iOS 版にだけ最新の画面・機能が反映されないとき

Web 版に存在する画面(例: 目標タブ)が iOS 版に出てこない場合、
ほぼ確実に **iOS アプリへ同梱された web 資産が古い**ことが原因である。
`ios/App/App/public` は `.gitignore` 対象で Xcode ビルド時に自動生成されないため、
`cap sync` を実行しない限り前回同梱された `dist/` がそのまま残る。

確認と復旧手順:

1. 端末上でアプリの 連携タブ →「ビルド情報」でビルド日時を確認する。
   日時が古ければ web 資産が更新されていない。
2. `npm run ios:sync` を実行する(`npm run build` 単体では iOS に反映されない)。
3. `ios/App/App/public/index.html` と `public/assets/` のタイムスタンプが
   更新されていることを確認する。
4. Xcode で Product → Clean Build Folder(⇧⌘K)してから再ビルドする。
   `public` はフォルダ参照のため、増分ビルドで再コピーされないことがある。
5. 実機・シミュレータからアプリを一度削除してから入れ直す。

なお対応 OS は iOS 15.4 以上(`vite.config.ts` の `build.target` と一致)。
それ未満の端末では JS が読み込めず、タブどころか画面全体が表示されない。

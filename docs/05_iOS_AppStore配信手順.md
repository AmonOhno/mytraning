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
npx cap sync ios
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
npx cap open ios    # Xcode が開く
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
npm run build && npx cap sync ios && npx cap open ios
# Xcode でビルド番号を上げて Archive → Upload
```

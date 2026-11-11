# 線香花火

夏の夜、縁側で楽しむ 3D の線香花火ゲーム。

**遊ぶ:** https://techgymjp.github.io/senko/

## 遊び方

- 線香花火は「着火 → 牡丹 → 松葉 → 柳 → 散り菊」と移り変わり、最後に火玉が **ぽたり** と落ちます。
  - 着火：炎で紙の先が燃え、火玉ができて小さな火花が出始める
  - 牡丹：火花が大きく「ぱっ」と広がる
  - 松葉：細く長い火花が勢いよく、松の葉のように枝分かれして飛ぶ
  - 柳：火花が垂れ下がるように散る
  - 散り菊：小さく暗い火花になり、火玉が冷めて震え、落ちる
- 落ちた火玉が地面につく前に、空中でタップ（クリック）すると成功。ゲーム中は文字を出さず、得点は結果画面で見られます。
- 落ちてすぐ取るほど高得点（極 300 / 見事 200 / よし 100）。連続で取ると倍率が上がります。
- 花火は時間とともにどんどん増え、燃え方も速くなります。
- 地面に落とすと命がひとつ減り、3 つ失うとおしまい。20 連続ごとに命がひとつ戻ります。
- 燃えている火玉を早まって触ると連続が途切れます。

## 技術メモ

- Three.js（`vendor/` に同梱、r160）＋ブルーム。Web 版はビルド不要の静的サイトです（GitHub Pages で公開）。
- 効果音（ぱちぱち、ぽたっ、じゅっ、風鈴、虫の声）と、遠くから聞こえる祭り囃子の BGM（大太鼓・締太鼓・鉦・篠笛）は、すべて Web Audio で合成しています。
- ローカルで動かす: `python3 -m http.server` を実行して http://localhost:8000/ を開く（ES モジュールのため file:// では動きません）。

## Android アプリ

[Capacitor](https://capacitorjs.com/) でゲームのファイルをアプリに同梱し、Android アプリにしています（オフラインで遊べます）。
構成は techgymjp/jet-fighter の `docs/ANDROID_PORTING.md`、techgymjp/jackal と同じです。

**動作確認用の APK（テスト広告）**

- リリース画面: https://github.com/techgymjp/senko/releases/tag/android-latest
- APK 直接: https://github.com/techgymjp/senko/releases/latest/download/senko.apk

<img src="docs/apk-qr.png" width="200" alt="リリース画面の QR コード">

- パッケージ名: `jp.techgym.senko`
- アプリ名: ホーム画面で「線香花火」（英語の端末では Senko）
- 縦画面固定・全画面・プレイ中は画面を消さない
- 戻るボタン: プレイ中はひと休み（ひと休み中なら再開）、あそびかたではタイトルへ、タイトル・結果画面ではアプリを終了
- 別アプリに切り替えると自動でひと休みにして音を止める
- シェアは Android の共有メニュー（Web 版はブラウザの共有、なければコピー）
- 広告（AdMob）
  - バナー: タイトル・あそびかた・ひと休み・結果画面の下中央（プレイ中はタップの邪魔になるので出さない）
  - 全画面広告（インタースティシャル）: 「火をつける」（プレイ開始）、「タイトルへ」「もどる」（タイトルに戻る）、ひと休みからの「つづける」、結果画面の「もう一度」のたびに毎回
  - リワード広告（チート）: 最後の命を落としたら「もう一本？」の画面で、広告を見ると命がひとつ戻って続けられる（1 ゲーム 1 回。落ちた様子を見届けられるよう 2.4 秒後に出し、7 秒で自動的に結果画面へ）。使ったことは結果画面とシェア文に「コンティニュー 1 回」と出る
  - EU など同意が必要な地域ではタイトル画面に「広告の設定」
- タイトル画面にバージョン（ビルド番号）とプライバシーポリシーへのリンク

ビルドは GitHub Actions（`.github/workflows/android.yml`）で行います。

1. `npm ci` → `npm run build:app`（`www/` に Web ファイルをコピーし、Web 版だけの部分〔テスト用の `window.__senko`〕を取り除き、`ads-config.js` と `build-info.js` を生成）→ `npx cap sync android` → `./gradlew assembleDebug`
2. 既定ブランチなら、Release `android-latest` の `senko.apk` を差し替え（動作確認用・テスト広告）
3. GitHub Secrets に署名鍵（`ANDROID_KEYSTORE_BASE64` / `ANDROID_KEYSTORE_PASSWORD` / `ANDROID_KEY_ALIAS` / `ANDROID_KEY_PASSWORD`）があれば、本番広告で署名付き AAB を作り Artifact（`senko-release-aab`）に上げる

AdMob のアプリ ID は `android/app/src/main/res/values/strings.xml` の `admob_app_id`（今は Google のテスト用）、本番の広告ユニット ID は `ads.js` の `UNITS.android.production`（今は空）にあります。
動作確認用 APK はどれもテスト広告、Google Play 用の AAB は本番の広告です（広告ユニット ID が空の種類は出さない）。

手元で試すとき: `npm install` → `npm run android:sync` → `npm run android:open`（Android Studio が必要）。
アイコンと起動画面は `assets/` の元画像から `npx @capacitor/assets generate --android` で生成しています。

## ファイル

| ファイル | 内容 |
| --- | --- |
| `index.html` | 画面（タイトル・あそびかた・ひと休み・結果など）と、日本語・英語の文言 |
| `game.js` | ゲーム本体（3D 描画・線香花火・音・画面の流れ） |
| `ads.js` | 広告（Android アプリのときだけ動く） |
| `ads-config.js` / `build-info.js` | 広告のモードとバージョン表示（ビルド時に `www/` へ生成し直す） |
| `vendor/three/` | three.js r160（MIT License） |
| `android/` | Android アプリのプロジェクト（Capacitor） |
| `assets/` | アイコンと起動画面の元画像 |
| `scripts/build-web.js` | Web ファイルを `www/` にまとめる |
| `docs/store/` | ストアの掲載文の下書き |

## ライセンス

著作権はテックジム株式会社に帰属します（All rights reserved）。許可なく複製・改変・再配布すること、Web サイトやアプリ（Google Play、App Store など）として公開・販売すること、名前・ロゴ・アイコン・画像を使うことを禁止します。
テックジムの受講生が学習目的で複製・改変することは許可します（アプリストアでの公開、広告の掲載、販売などの商用利用は禁止。著作権表示を残すこと）。
同梱の three.js は MIT License のままです。詳しくは `LICENSE` を見てください。

## English

**Senko Hanabi** — a 3D Japanese sparkler game on a summer-night veranda.

- The sparkler goes through its real stages: ignition → *botan* (peony) → *matsuba* (pine needles) → *yanagi* (willow) → *chirigiku* (falling chrysanthemum), and finally the glowing bead **drops**.
- Tap the falling bead in mid-air before it hits the ground. The sooner you catch it, the higher the score (Perfect 300 / Great 200 / Good 100). Streaks raise a multiplier.
- More sparklers keep appearing and burn faster over time. Drop three beads and the game is over (every 20 catches in a row gives one back).
- The language follows your browser setting; use the button at the bottom-left to switch between English and Japanese (or add `?lang=en` / `?lang=ja` to the URL).

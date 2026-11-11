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
- 落ちた火玉が地面につく前に、空中でタップ（クリック）すると成功。
- 落ちてすぐ取るほど高得点（極 300 / 見事 200 / よし 100）。連続で取ると倍率が上がります。
- 花火は時間とともにどんどん増え、燃え方も速くなります。
- 地面に落とすと命がひとつ減り、3 つ失うとおしまい。20 連続ごとに命がひとつ戻ります。
- 燃えている火玉を早まって触ると連続が途切れます。

## 技術メモ

- Three.js（`vendor/` に同梱、r160）＋ブルーム。ビルド不要の静的サイトです。
- 効果音（ぱちぱち、ぽたっ、じゅっ、風鈴、虫の声）と、遠くから聞こえる祭り囃子の BGM（大太鼓・締太鼓・鉦・篠笛）は、すべて Web Audio で合成しています。
- ローカルで動かす: `python3 -m http.server` を実行して http://localhost:8000/ を開く（ES モジュールのため file:// では動きません）。

## English

**Senko Hanabi** — a 3D Japanese sparkler game on a summer-night veranda.

- The sparkler goes through its real stages: ignition → *botan* (peony) → *matsuba* (pine needles) → *yanagi* (willow) → *chirigiku* (falling chrysanthemum), and finally the glowing bead **drops**.
- Tap the falling bead in mid-air before it hits the ground. The sooner you catch it, the higher the score (Perfect 300 / Great 200 / Good 100). Streaks raise a multiplier.
- More sparklers keep appearing and burn faster over time. Drop three beads and the game is over (every 20 catches in a row gives one back).
- The language follows your browser setting; use the button at the bottom-left to switch between English and Japanese (or add `?lang=en` / `?lang=ja` to the URL).

# 手書き入力の仕様

## 筆記

- Pointer Events、利用可能な端末では coalesced events / pointerrawupdate を利用。
- 筆圧は線幅に反映。ペンの動作中と直後は手のひら由来のタッチを抑制。
- ベクトル筆跡を保持し、表示倍率・devicePixelRatio に合わせて再描画。画面のリサイズ時にも縦横比を維持。
- チョーク、直線、マーカー、消しゴム、元に戻す・やり直す、全消去・復元、PNG 出力、JSON 保存・読込。
- 標準の描画イベントをできるだけ取りこぼさない実装。端末のハードウェアサンプリング頻度や OS の制限を超える感度にはできない。

## 検索用の文字候補

`recognizeStrokes(strokes, {limit:8,script:'all'})` は一文字の筆跡から端末内で候補を返す。一般的なひらがな・カタカナ、濁音・半濁音、ゐ・ゑ、および基本漢字を含むオリジナルの中心線テンプレートと、筆跡の動的時間伸縮距離を利用する。

`recognizeHandwriting` は自己ホストの KanjiVG 字形データ（r20260714、6,603 字形、約 2.62 MB）を必要時に読み込み、Web Worker 内で候補を計算する。元データの SVG 曲線をストロークごとに 12 点へ等距離サンプリングし、8-bit 座標に正規化した派生データを利用。小書きのかなは字形サイズで誤認しないよう候補を通常サイズに統一し、`toggleSmallKana(text)` で利用者の明示的な小書き選択を提供できる。

字形・書き順によって候補が変わるため、一般的な文章 OCR と同じ認識精度は保証しない。一文字ずつ楷書で入力し、候補を利用者が確認して確定する。スコアは形状の類似度であり、正解確率ではない。長文・くずし字・連綿は対象外。追加字形データが読み込めなくても、基本かな・漢字のオリジナルテンプレートによる候補を表示する。

`recognizeHandwriting` は標準 Handwriting Recognition API と日本語モデルが端末に存在する場合に限り利用し、それ以外では上記ローカル候補方式に戻る。外部の認識サービスへのリクエストは送らない。ブラウザ・OS による標準 API の対応を保証しない。入力された文章を無条件に認識したかのように表示してはならない。

## 一次資料

- KanjiVG © Ulrich Apel and contributors, https://kanjivg.tagaini.net/ / https://github.com/KanjiVG/kanjivg/releases/tag/r20260714 — CC BY-SA 3.0。派生ファイル `dist/kanjivg-data.json` も CC BY-SA 3.0。元ライセンスを `dist/kanjivg-license.txt` に保存。著作者・出典・加工内容・ライセンスをデータ内と利用画面の出典に表示する。
- 2026-11-25 に GitHub Releases API `/repos/KanjiVG/kanjivg/releases/latest` で r20260714 を取得。検索エンジンのキャッシュではプレリリース表示が残っていたが、配布元の現行 API を優先。
- WICG, Handwriting Recognition API (Draft Community Group Report, 15 November 2026), https://wicg.github.io/handwriting-recognition/ — API 呼び出し形と候補取得の仕様を確認。公開標準ではなく草案。
- Pointer Events の実装は機能検出を用い、coalesced events がない環境では通常 pointermove に戻る。

## モジュール API

`new InkBoard(canvas,{onChange(strokes,board),color,width,tool,background})`

- `getStrokes()` / `setStrokes(strokes)`
- `setTool('pen'|'chalk'|'line'|'highlighter'|'eraser')`
- `setColor(color)` / `setWidth(width)` / `setEnabled(bool)`
- `undo()` / `redo()` / `clear()`
- `exportPNG(background)` — PNG data URL
- `exportJSON()` / `importJSON(json)`
- `resize()` / `destroy()`

各ストロークは `{points:[{x,y,pressure,t}],tool,color,width,viewport:{width,height}}`。幅や座標は記録時の論理キャンバス座標。`setStrokes` は点配列の配列にも対応。`onChange` はユーザー編集が確定したときに発火し、`setStrokes` では発火しない。

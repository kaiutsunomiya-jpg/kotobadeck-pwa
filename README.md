# たんたんご！ PWA v7

GitHub Pagesで動く、単語学習・瞬間作文練習のPWAです。**2種類のCSVをファイル名で自動認識して一覧に追加**します。

## v7の変更点（2026年11月19日）

- **2列CSVの「瞬間作文テスト」のみ**：日本語原文を上半分の下端に揃え、英文を下半分の上端に揃えました。原文と訳文が中央の境界付近に隣接し、視線移動を減らします。英文を表示する前後で日本語の位置は変わりません。
- **文字を少し拡大**：日本語・英文のテスト表示をそれぞれ若干大きくしました。
- **スマホのダブルタップ拡大を抑制**：`touch-action: manipulation` を採用。画面スクロール・アクセシビリティのためのピンチ拡大は維持します。iOSのバージョンによって挙動が異なる場合があります。
- **5列CSVの単語学習テスト画面は変更なし**。
- **互換性**：GitHub ActionsによるCSV自動読込、同じIndexedDBによる⭐保存、およびPWAの公開URLを維持しています。CSV追加や復習登録はこれまでどおりです。

**既存のGitHubリポジトリの同じ階層に、ZIPを解凍したファイルを上書きしてコミット**してください。`.github/workflows/deploy-pages.yml` はそのまま使用できます。ホーム画面からPWAを削除する必要はありません。

更新後はオンラインでPWAを開き直してください。`styles.css` / `app.js` の参照URLと `sw.js` のキャッシュバージョンを v7 に更新しています。

## 既存の機能

- **5列CSV**：従来どおり「単語 → 日本語訳 → 例文・例文訳」。5列目で指定した強調箇所は太字＋下線。
- **2列CSV**：「日本語例文 → 訳文」の瞬間作文。単語一覧に日本語文と訳文を表示。タップで画面下部に訳文。テストでは最初に日本語文だけを表示し、タップすると下半分に訳文を表示。
- どちらもCSV順／ランダム、⭐の復習登録・絞り込み、テストの「前へ」、単語タップ時の最上部スクロールに対応。
- 韓国語・英語は**空白区切りの単語を途中で改行せず**、スペースの位置でのみ改行（長すぎる単語は横スクロール）。**日本語には単語間の空白がない**ため、日本語部分は日本語として自然な文字組で改行します。
- デバイスからCSVを追加するボタン・操作は削除。GitHubの `VocabularySets` フォルダ内のCSVのみ読み込みます。
- モルモット画像・縦表示優先の調整・⭐復習データの保存は継続。

## 同梱CSV

1. `VocabularySets/第47回TOPIKⅡ_上級韓国語100単語(1).csv` — 韓国語100語・5列・強調箇所入力済み
2. `VocabularySets/瞬間英作文100_セット1.csv` — 瞬間作文100文・2列（ユーザー提供ファイルをそのまま収録）

## ★ 初回のGitHub設定：必須

GitHub Pagesは通常、ディレクトリ中のファイル名を直接列挙できません。そこで**GitHub ActionsがCSV一覧（`VocabularySets/index.json`）を自動生成してから公開**するようにしました。

### 1. ファイルを置き換える

1. このZIPを解凍する。
2. GitHubの**現在利用中の同じリポジトリ**を開く。
3. 解凍したフォルダの**中身**（`index.html`、`app.js`、`styles.css`、`sw.js`、`manifest.webmanifest`、`VocabularySets`、`icons`、`scripts`、`.github` など）を、元の階層を保ってアップロード・上書き・コミットする。
4. **必ず** `.github/workflows/deploy-pages.yml` と `scripts/build_site.py` の2ファイルがGitHub上に存在することを確認する。MacのFinderで隠しフォルダ `.github` が見えない場合は **Command + Shift + .（ピリオド）** で表示する。
5. 以前のCSVで使わなくなったものが `VocabularySets` に残っていると、それも自動で表示されます。不要であればGitHubで削除してください。

※ ZIPを丸ごと1ファイルとしてアップロードするのではなく、解凍した**中のファイル**を配置してください。`index.html` がリポジトリ直下になる構成です。

### 2. GitHub PagesをGitHub Actionsに切り替える（最初の1回だけ）

リポジトリの **Settings → Pages → Build and deployment → Source → `GitHub Actions`** を選択します。

その後、**Actions** タブで `Deploy たんたんご PWA` ワークフローを選択し、`Run workflow` を押して初回公開を実行します。ワークフローが `main` ブランチへのプッシュで実行されていれば、手動実行は不要です。

ワークフローの完了状態が緑（成功）になれば、いつものGitHub Pages URLで動きます。初回公開時はGitHubの設定次第で権限の承認が必要になる場合があります。

**この設定をせずに、従来の「Deploy from a branch」のままにすると、CSVの追加が自動反映されません。**

## 今後はCSVを入れるだけでOK

1. GitHubの `VocabularySets/` フォルダに新しいCSVをアップロードし、コミットする。
2. GitHub Actionsが自動でCSVを検出し、一覧の `index.json` を生成してサイトを更新する。
3. PWAを再起動または更新すると、CSVのファイル名（拡張子なし）がホーム画面に追加される。

`app.js` / `sw.js` / `index.json` を手作業で更新する必要はありません。

### CSVの形式

**5列：単語学習**

```csv
単語,日本語訳,例文,例文の日本語訳,強調箇所
세련되다,洗練されている,인테리어가 세련되어 보인다.,内装が洗練されて見える。,세련되어
```

**2列：瞬間作文**

```csv
日本語例文,訳文
遅れてごめんなさい。,I'm sorry I'm late.
```

- UTF-8（BOM付きも可）で保存してください。
- 1行目の見出しは上記と完全一致させます。
- セルにカンマ・改行が含まれる場合は、標準CSVのダブルクォートによる引用形式を使ってください。
- 過去の4列CSV（5列目なし）も読み込み可能ですが、新規作成は2列か5列を推奨します。
- 不正なCSVがあると、GitHub Actionsのビルドが失敗して公開されません。Actionsのエラーメッセージでファイル名と行番号を確認できます。

## 復習⭐の保存と以前のバージョンについて

前バージョンと同じGitHub Pages URL、IndexedDB名（`kotobadeck-local-sets`）、⭐保存形式を維持しています。同じファイル名・見出し語・日本語訳の組み合わせであれば、**以前に登録した⭐は引き継がれる設計**です。

- **以前端末から追加したCSVは、今回から画面には表示されません。** 過去の端末内保存レコード自体は削除せず残します。
- iPhoneのホーム画面からアプリを削除したり、Safariのサイトデータを消去したり、公開URLを変更した場合は、⭐が失われる可能性があります。絶対に消えない保証はありません。
- キャッシュされた古い画面が残る場合は、オンライン状態でサイトを開き直してください。

## ファイル構成

```text
たんたんご_PWA_v6_2列5列自動読込/
├── .github/workflows/deploy-pages.yml  ← ★ 自動公開の設定
├── scripts/build_site.py                ← ★ CSV一覧を自動生成
├── VocabularySets/                      ← ★ 今後CSVを置く場所
│   ├── index.json                       ← 初期表示用。公開時は自動再生成
│   ├── 第47回TOPIKⅡ_上級韓国語100単語(1).csv
│   └── 瞬間英作文100_セット1.csv
├── icons/
├── app.js
├── styles.css
├── sw.js
├── index.html
├── manifest.webmanifest
└── README.md
```

## ローカル表示を確認する場合（任意）

`python3 scripts/build_site.py` を実行すると `dist/` が生成されます。そのフォルダをローカルWebサーバーで開きます。

```bash
python3 scripts/build_site.py
cd dist
python3 -m http.server 8000
```

ブラウザで `http://localhost:8000` を開きます。

GitHub Pagesの公式説明：https://docs.github.com/ja/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages

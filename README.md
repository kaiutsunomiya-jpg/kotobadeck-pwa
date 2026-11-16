# KotobaDeck — iPhone用の単語学習PWA

既存のSwiftUI版KotobaDeckを、iPhoneのSafariからホーム画面に追加して使える**無料のPWA**として作り直したものです。
Xcode / Mac / Apple Developer Program / App Storeは、PWA版の普段の使用には必要ありません。

## 同梱済みのデータと機能

- 元の `韓国語単語41語_例文付き(1).csv`（41語、見出し1行）を**内容を変更せずに同梱**。
- 一覧：CSV順で左に単語、右に日本語訳。
- 単語タップ：下半分に例文と例文の訳を表示。上半分のリストをスクロールし、別の単語を選択可能。
- 右上シャッフル：押すとランダム順、もう一度でCSV順。再度ランダムにすると新しい順序。
- 上中央「テスト」：単語だけ → タップで訳・例文・訳 → タップで次へ。左上に戻る、右上に進捗。
- iPhone内に追加したCSVはIndexedDBに保存。**追加時もXcodeのビルドや再公開は不要**。
- Service Workerで本体・同梱CSVをキャッシュし、初回のオンライン読み込み後はオフライン学習に対応。
- アイコンは前に作成したモルモット写真の正方形PNGを使用。

## 公開する手順（GitHub Pages、無料）

### A. プロジェクトをGitHubにアップロード

1. [GitHub](https://github.com/) の無料アカウントでログインする。
2. `+ → New repository` をクリックし、たとえば **`kotobadeck-pwa`** という名前で新規リポジトリを作る。
3. `Public` を選ぶ（GitHub FreeでPagesを使う条件）。`Add a README file` をオンにして作成してもよい。
4. ダウンロードした `KotobaDeck_PWA.zip` を**解凍する**。
5. リポジトリ画面で `Add file → Upload files` をクリックする。
6. 解凍した `KotobaDeck_PWA` フォルダの**中身すべて**（`index.html`、`app.js`、`styles.css`、`sw.js`、`manifest.webmanifest`、`icons` フォルダ、`VocabularySets` フォルダなど）をドラッグ＆ドロップする。ZIPをそのままアップロードしてもWebアプリにはなりません。
7. 画面の指示に従って `Commit changes` する。

**重要：`index.html` がリポジトリの最上位（ルート）にあることを確認してください。**

### B. Pagesを有効にする

1. リポジトリの `Settings → Pages` に移動。
2. `Build and deployment → Source` は **`Deploy from a branch`** を選択。
3. `Branch` を **`main`**、フォルダを **`/(root)`** にして `Save`。
4. サイトが公開されたら、`Settings → Pages → Visit site` からURLを確認。

URL例：`https://ユーザー名.github.io/kotobadeck-pwa/`

※ `ユーザー名` とリポジトリ名に応じてURLは変わります。公開完了前には404になることがあります。

### C. iPhoneのホーム画面に追加

1. iPhoneの**Safari**で、上のGitHub Pages URLを開く。
2. 共有メニュー → **ホーム画面に追加**。
3. **「Webアプリとして開く」** が表示されたらオンにする。
4. `追加` をタップ。以後はホーム画面のアイコンから起動。
5. **初回はネット接続した状態で一度起動**して、同梱CSV・本体のオフラインキャッシュを作成する。

iPhoneで同じアプリをSafariタブでも開けますが、ホーム画面版とは保存領域が異なる場合があるため、**CSVの追加はホーム画面から起動したアプリ内**で行ってください。

## 新しいCSVを追加する（Mac不要）

1. iPhoneの**「ファイル」**アプリにCSVを保存する（メール、AirDrop、ダウンロードなどで受け取れます）。
2. ホーム画面のKotobaDeckを開く。
3. メニューの **「CSVを追加」** をタップしてファイルを選ぶ。
4. ファイル名（末尾 `.csv` を除く）が新しい単語セットとして表示されます。
5. CSVはiPhone内のアプリ用ストレージに保存され、アプリを閉じても継続して利用できます。**同じファイル名を再追加すると、そのセットを更新**します。

**CSVの1行目は必ず次の見出しにすること：**

```csv
単語,日本語訳,例文,例文の日本語訳
안녕하세요,こんにちは,안녕하세요! 만나서 반가워요.,こんにちは！お会いできてうれしいです。
"사과, 배","りんご、梨",저는 사과와 배를 좋아해요.,私はりんごと梨が好きです。
```

- UTF-8、BOM付きUTF-8対応。1行目はヘッダー、以後の各行が単語1件です。
- 値にカンマ・改行・二重引用符を含むときは、CSVの標準の引用規則で囲んでください。
- 例の2行は形式説明用であり、同梱CSVの内容とは異なります。

## CSVをPWAに同梱する場合（任意）

端末内でCSVをインポートするだけなら、この作業は不要です。
最初からすべてのiPhoneでセットを表示したいときだけ、以下のように更新します。

1. `VocabularySets/` にCSVを追加してGitHubにコミットする。
2. `app.js` 冒頭の `BUNDLED_CSV_FILES` 配列にファイル名を追加する。
3. `sw.js` の `CORE` に `./VocabularySets/新しいファイル名.csv` を追加する（日本語のファイル名はURLエンコード推奨）。
4. `sw.js` の `VERSION` を `kotobadeck-pwa-v2` 等に更新してコミットする。

## 保存・公開に関する注意

- **GitHub PagesのURLは公開Webサイト**です。リポジトリをPublicで作ると、`VocabularySets`内に同梱したCSVも**誰でも取得可能**です。非公開データは同梱しないでください。
- 一方、アプリ画面の「CSVを追加」で読み込んだファイルの内容は**GitHubには送信されず、そのiPhoneのブラウザ保存領域（IndexedDB）に保存**されます。
- アプリの削除、サイトデータ消去、iPhoneの初期化、端末変更などで、**端末内に追加したCSVデータが失われる可能性**があります。元CSVは必ず「ファイル」やクラウドストレージ等にバックアップしてください。
- Wi-Fiがない場所でも、インストール済みかつ必要ファイルのキャッシュが残っている場合は利用できます。キャッシュはOSの空き容量管理等で削除されることがあるため、オフライン動作が永久に保証されるわけではありません。
- 初回の公開や更新確認にはネット接続が必要です。
- Swiftの `.xcodeproj` はPWAには含まれません。元のSwiftUI版とは独立したWebアプリです。
- GitHub Pagesの提供条件は変更される場合があります。

## ファイル一覧

```text
KotobaDeck_PWA/
├── index.html              ← Webアプリの入口
├── app.js                  ← 一覧・テスト・CSV管理
├── styles.css              ← iPhone向けの画面デザイン
├── sw.js                   ← オフライン用キャッシュ
├── manifest.webmanifest    ← ホーム画面アプリ名・アイコン
├── .nojekyll               ← GitHub Pages用
├── icons/                  ← アイコン画像
│   ├── icon-192.png
│   ├── icon-512.png
│   └── apple-touch-icon.png
├── VocabularySets/         ← ★ 同梱用CSVを置く場所 ★
│   └── 韓国語単語41語_例文付き(1).csv
└── README.md
```

## ローカルで動作確認する場合（任意）

PWAは `file://` で直接開くより、ローカルWebサーバーから開くほうが確実です。
Macのターミナルで、解凍した `KotobaDeck_PWA` フォルダに移動して以下を実行できます。

```bash
python3 -m http.server 8000
```

ブラウザで `http://localhost:8000/` にアクセスします。本番利用にはGitHub PagesのHTTPS URLを使用してください。

参考：
- GitHub Pages: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- GitHub ファイルアップロード: https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository
- Apple ホーム画面に追加: https://support.apple.com/en-gb/guide/iphone/iphea86e5236/27/ios/27

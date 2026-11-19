# たんたんご！ PWA v9 — 単語学習・瞬間作文の2メニュー

従来のPWAを**ホーム → 学習モード → CSVセット → 学習・テスト**の4段階に変更した完全ファイルセットです。

## 画面とCSVの対応

- ホーム：**単語学習**／**瞬間作文**の2つのボタンを表示。
- **単語学習**を選択 → `VocabularySets/Vocabulary/` 内のCSVが一覧に並ぶ。
- **瞬間作文**を選択 → `VocabularySets/Flash/` 内のCSVが一覧に並ぶ。
- CSV名を押すと従来の単語一覧・テストに進みます。右上の⭐復習絞り込み、ランダム順、テスト中の「前へ」、2列モードの左揃え・隣接表示、5列モードの例文強調など、既存の機能は維持。
- 各画面の左上の「セット」「ホーム」で前のメニューに戻れます。

## ファイルの配置場所

```text
リポジトリ直下/
├── index.html
├── app.js
├── styles.css
├── sw.js
├── manifest.webmanifest
├── icons/                         ← モルモットのアプリアイコン
├── VocabularySets/
│   ├── Flash/                     ← ★ 2列の瞬間作文CSV
│   │   └── 瞬間英作文100_セット1.csv
│   ├── Vocabulary/                ← ★ 5列の単語学習CSV
│   │   └── 第47回TOPIKⅡ_上級韓国語100単語(1).csv
│   └── index.json                 ← 公開時に自動生成（手動編集は不要）
├── scripts/
│   └── build_site.py              ← ★ CSVの自動検出・一覧生成
└── .github/
    └── workflows/
        └── deploy-pages.yml      ← GitHub Actions。v8から変更なし
```

同梱するサンプルデータは**従来のTOPIK100語（強調箇所入り）と瞬間英作文100文**です。

**新しいCSVの追加**：GitHub上の該当フォルダにCSVをアップロードし、コミットするだけです。GitHub Actionsが`VocabularySets/index.json`を再生成し、サイトを更新します。`app.js`や`sw.js`のファイル名リストは編集不要です。

## CSVの形式

### Vocabulary（5列）

```csv
単語,日本語訳,例文,例文の日本語訳,強調箇所
세련되다,洗練されている,인테리어가 세련되어 보인다.,内装が洗練されて見える。,세련되어
```

過去の4列CSVも読み込み可能ですが、新規の単語学習CSVは5列で作成してください。

### Flash（2列）

```csv
日本語例文,訳文
遅れてごめんなさい。,I'm sorry I'm late.
```

UTF-8またはUTF-8 BOM付きで保存し、必ず最初の1行に上記のヘッダーを入れます。カンマを含むセルは通常のCSV引用規則で `"..."` で囲んでください。

**フォルダと形式が一致しないCSVは、GitHub Actionsでエラーになります。** これにより2列ファイルが単語学習側に混ざることを防ぎます。

## GitHubへアップロードする際の重要事項

1. このZIPを**解凍**します。ZIPの**中身がリポジトリ直下**になるようにアップロード・上書きしてください。
2. **必ず** `scripts/build_site.py` を新版に置き換えてください。`app.js`だけ変更しても、新しいフォルダが自動検出されません。
3. `VocabularySets/Flash/` と `VocabularySets/Vocabulary/` を作成して各CSVを置きます。このZIPには両フォルダとサンプルCSVが含まれます。
4. **旧CSVを`VocabularySets/`直下から新しい2フォルダへ移動**してください。古い直下CSVは新版スクリプトでは読み込まれず、公開もしません。GitHubリポジトリからは不要なら削除できます。
5. `Settings → Pages → Source = GitHub Actions` の既存設定はそのままでOK。現在動作している `.github/workflows/deploy-pages.yml` も変更不要です（ZIP内にも同じ内容を収録）。GitHubのWeb画面で隠しフォルダをアップロードできない場合は、既存の`.github`を触らず、そのほかのファイルを更新してください。
6. `main` ブランチへのコミット後、GitHubの**Actions**で `Deploy たんたんご PWA` が成功したら、同じ公開URLをiPhoneで開いてください。

**GitHubにある既存のCSVが編集済みの場合**：ZIP同梱のCSVで内容を上書きせず、現在のCSVを正しい新フォルダへ移動してください。リポジトリ直下の `index.json` は公開用スクリプトで再生成されます。

## ⭐復習データの保持

- IndexedDB名 `kotobadeck-local-sets`、保存形式、サイトURLは変えていません。
- フォルダ追加でセットIDが `bundled:ファイル名` から `bundled:Vocabulary/ファイル名` または `bundled:Flash/ファイル名` へ変わるため、旧⭐を**初回起動時に新しいIDへ移行**する処理を追加しました。
- 移行元の古い⭐IDは移行後に削除するため、⭐を外してアプリを再起動しても復活しません。
- **既存PWAをホーム画面から削除しないでください。** 同じGitHub Pages URLで更新すれば端末内の⭐を引き継げる設計です。ただし、OSやブラウザのサイトデータ削除による消失は防げません。

## 動作確認（開発用）

```bash
python3 scripts/build_site.py
cd dist
python3 -m http.server 8000
```

ブラウザで `http://localhost:8000/` を開くと、GitHub Pagesと同じ構造で確認できます。通常はローカル実行の必要はありません。

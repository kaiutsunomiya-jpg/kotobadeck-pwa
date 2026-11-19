#!/usr/bin/env python3
"""Generate a GitHub Pages PWA with CSVs grouped into Vocabulary / Flash.

GitHub Actions runs this script on commits. Python 3 standard library only.
"""
from __future__ import annotations

import csv
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEST = ROOT / "dist"
SETS = ROOT / "VocabularySets"
DIRECTORIES = {
    "Vocabulary": {"mode": "vocabulary", "headers": [
        ["単語", "日本語訳", "例文", "例文の日本語訳", "強調箇所"],
        # 旧4列のバックアップも読み込めるようにする。
        ["単語", "日本語訳", "例文", "例文の日本語訳"],
    ]},
    "Flash": {"mode": "composition", "headers": [["日本語例文", "訳文"]]},
}


def check_csv(path: Path, folder: str) -> dict:
    try:
        with path.open("r", encoding="utf-8-sig", newline="") as handle:
            rows = [row for row in csv.reader(handle, strict=True) if any(x.strip() for x in row)]
    except (UnicodeError, csv.Error) as error:
        raise ValueError(f"{path}: UTF-8形式のCSVを読み取れません: {error}") from error
    if len(rows) < 2:
        raise ValueError(f"{path}: ヘッダーとデータ行が必要です")
    header = [cell.strip() for cell in rows[0]]
    if header not in DIRECTORIES[folder]["headers"]:
        raise ValueError(f"{path}: {folder}用のCSVヘッダーではありません: {header}")
    width = len(header)
    for number, row in enumerate(rows[1:], start=2):
        # 5列モードの旧CSVで第5セルが省略されていても従来どおり認める。
        if len(row) != width and not (width == 5 and len(row) == 4):
            raise ValueError(f"{path} {number}行目: {len(row)}列です。必要な列数は{width}列です")
        if not row[0].strip():
            raise ValueError(f"{path} {number}行目: 最初の項目が空欄です")
    return {
        "name": path.name,
        "path": f"{folder}/{path.name}",
        "folder": folder,
        "mode": DIRECTORIES[folder]["mode"],
        "count": len(rows) - 1,
    }


def build() -> None:
    files = []
    for folder in DIRECTORIES:
        directory = SETS / folder
        if not directory.is_dir():
            raise ValueError(f"{directory} がありません")
        files.extend(check_csv(p, folder) for p in sorted(directory.glob("*.csv"), key=lambda x: x.name.casefold()))
    catalog = {"version": 2, "files": files}
    if DEST.exists():
        shutil.rmtree(DEST)
    DEST.mkdir(parents=True)
    for name in ("index.html", "app.js", "styles.css", "sw.js", "manifest.webmanifest", ".nojekyll"):
        shutil.copy2(ROOT / name, DEST / name)
    shutil.copytree(ROOT / "icons", DEST / "icons")
    dest_sets = DEST / "VocabularySets"
    dest_sets.mkdir()
    for folder in DIRECTORIES:
        shutil.copytree(SETS / folder, dest_sets / folder)
    text = json.dumps(catalog, ensure_ascii=False, indent=2) + "\n"
    (dest_sets / "index.json").write_text(text, encoding="utf-8")
    print(f"OK: {len(files)}セットを公開します")
    for item in files:
        print(f"  {item['path']} ({item['mode']}: {item['count']})")
    legacy = list(SETS.glob('*.csv'))
    if legacy:
        print('注意: VocabularySets直下の旧CSVは公開対象外です: ' + ', '.join(p.name for p in legacy))


if __name__ == "__main__":
    build()

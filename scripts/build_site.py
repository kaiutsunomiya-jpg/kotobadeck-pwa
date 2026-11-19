#!/usr/bin/env python3
"""Build a complete GitHub Pages directory from VocabularySets/*.csv.

No dependencies beyond Python 3 stdlib. Run on every push via GitHub Actions.
"""
from __future__ import annotations

import csv
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEST = ROOT / "dist"
VOCAB = ROOT / "VocabularySets"
HEADERS_2 = ["日本語例文", "訳文"]
HEADERS_5 = ["単語", "日本語訳", "例文", "例文の日本語訳", "強調箇所"]
HEADERS_4 = HEADERS_5[:4]


def check_csv(path: Path) -> dict:
    try:
        with path.open("r", encoding="utf-8-sig", newline="") as f:
            rows = [row for row in csv.reader(f) if any(cell.strip() for cell in row)]
    except (UnicodeError, csv.Error) as error:
        raise ValueError(f"{path.name}: UTF-8のCSVを読み込めません: {error}") from error
    if not rows:
        raise ValueError(f"{path.name}: CSVが空です")
    header = [cell.strip() for cell in rows[0]]
    if header == HEADERS_2:
        mode, width = "composition", 2
    elif header == HEADERS_5:
        mode, width = "vocabulary", 5
    elif header == HEADERS_4:
        mode, width = "vocabulary", 4  # 過去CSVとの後方互換
    else:
        raise ValueError(f"{path.name}: ヘッダーが2列・5列形式に一致しません: {header}")
    for number, row in enumerate(rows[1:], start=2):
        if len(row) != width and not (width == 5 and len(row) == 4):
            raise ValueError(f"{path.name} {number}行目: {len(row)}列（必要：{width}列）")
        if not row[0].strip():
            raise ValueError(f"{path.name} {number}行目: 先頭列が空です")
    if len(rows) == 1:
        raise ValueError(f"{path.name}: データ行がありません")
    return {"name": path.name, "mode": mode, "count": len(rows) - 1}


def main() -> None:
    files = sorted(VOCAB.glob("*.csv"), key=lambda path: path.name.casefold())
    catalog = {"version": 1, "files": [check_csv(path) for path in files]}
    if DEST.exists():
        shutil.rmtree(DEST)
    DEST.mkdir()
    for file_name in ("index.html", "app.js", "styles.css", "sw.js", "manifest.webmanifest", ".nojekyll"):
        shutil.copy2(ROOT / file_name, DEST / file_name)
    shutil.copytree(ROOT / "icons", DEST / "icons")
    shutil.copytree(VOCAB, DEST / "VocabularySets", ignore=shutil.ignore_patterns("index.json"))
    (DEST / "VocabularySets" / "index.json").write_text(
        json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"OK: {len(files)}セットを公開します")
    for item in catalog["files"]:
        print(f"  {item['name']} ({item['mode']}: {item['count']})")


if __name__ == "__main__":
    main()

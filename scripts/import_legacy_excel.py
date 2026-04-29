#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path

from scripts.importers.legacy_excel.pipeline import run_import


def main() -> None:
    parser = argparse.ArgumentParser(description="Importa o workbook legado para staging JSON.")
    parser.add_argument(
        "--workbook",
        default="fichas-tecnicas-produtos-oficial.xlsx",
        help="Caminho do arquivo XLSX legado.",
    )
    parser.add_argument(
        "--output-dir",
        default=None,
        help="Diretório de saída para report e staging. Por padrão, usa artifacts/imports/<timestamp>.",
    )
    args = parser.parse_args()

    workbook_path = Path(args.workbook).resolve()
    output_dir = Path(args.output_dir).resolve() if args.output_dir else None

    if output_dir is None:
        output_dir = (
            Path(__file__).resolve().parents[1]
            / "artifacts"
            / "imports"
            / workbook_path.stem.replace(" ", "-")
        )

    report = run_import(workbook_path, output_dir=output_dir)
    print(json.dumps(report["summary"], ensure_ascii=False, indent=2))
    print(f"Artifacts written to: {output_dir}")


if __name__ == "__main__":
    main()

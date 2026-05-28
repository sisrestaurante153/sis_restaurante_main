from __future__ import annotations

import re
from datetime import datetime
from typing import Any

from ..normalize import normalize_header, normalize_name, normalize_unit


def find_header_row(worksheet, required_headers: set[str], search_limit: int = 10):
    for row_index, row in enumerate(
        worksheet.iter_rows(max_row=search_limit, values_only=True),
        start=1,
    ):
        normalized = [normalize_header(value) for value in row]
        if required_headers.issubset(set(normalized)):
            index_map = {}
            for col_index, header in enumerate(normalized):
                if header and header not in index_map:
                    index_map[header] = col_index
            return row_index, index_map
    raise ValueError(f"Header row not found for headers: {sorted(required_headers)}")


def as_iso_date(value: Any) -> str | None:
    if isinstance(value, datetime):
        return value.date().isoformat()
    return str(value) if value is not None else None


def clean_decimal(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    val_str = str(value).strip()
    if not val_str:
        return None
    val_str = val_str.replace("R$", "").strip()
    if "," in val_str:
        if "." in val_str:
            val_str = val_str.replace(".", "")
        val_str = val_str.replace(",", ".")
    try:
        return float(val_str)
    except ValueError:
        return None


def clean_display_name(name: Any) -> str:
    if name is None:
        return ""
    name_str = str(name).strip()
    # Remove prefixo numérico seguido de hífen no início do nome, ex: "43-Coração" ou "123 - Batata"
    name_str = re.sub(r"^\d+\s*-\s*", "", name_str)
    return name_str.strip()


def parse_vmarket_sheet(worksheet) -> list[dict[str, Any]]:
    _, columns = find_header_row(
        worksheet,
        {"codigo", "material", "secao", "unidade", "custo", "kg"},
    )
    rows: list[dict[str, Any]] = []

    for row_index, row in enumerate(worksheet.iter_rows(values_only=True), start=1):
        material = row[columns["material"]]
        if row_index <= 1 or material is None:
            continue

        cleaned_material = clean_display_name(material)
        if not cleaned_material:
            continue

        rows.append(
            {
                "sheet_name": worksheet.title,
                "row_number": row_index,
                "source_kind": "vmarket",
                "code": row[columns.get("codigo")],
                "display_name": cleaned_material,
                "canonical_name": normalize_name(cleaned_material),
                "purchase_unit": normalize_unit(row[columns.get("unidade")]),
                "section": row[columns.get("secao")],
                "package_units": clean_decimal(row[columns.get("peso")]),
                "purchase_cost": clean_decimal(row[columns.get("custo")]),
                "unit_cost_reference": clean_decimal(row[columns.get("kg")]),
                "loss_index": clean_decimal(row[columns.get("perda")]),
                "updated_at": as_iso_date(row[columns.get("data atualizacao")]),
            }
        )

    return rows


def parse_embalagens_sheet(worksheet) -> list[dict[str, Any]]:
    _, columns = find_header_row(
        worksheet,
        {"embalagem", "unidades", "custo", "ct unit"},
    )
    rows: list[dict[str, Any]] = []

    for row_index, row in enumerate(worksheet.iter_rows(values_only=True), start=1):
        embalagem = row[columns["embalagem"]]
        if row_index <= 1 or embalagem is None:
            continue

        cleaned_embalagem = clean_display_name(embalagem)
        if not cleaned_embalagem:
            continue

        rows.append(
            {
                "sheet_name": worksheet.title,
                "row_number": row_index,
                "source_kind": "embalagem",
                "code": row[columns.get("codigo")],
                "display_name": cleaned_embalagem,
                "canonical_name": normalize_name(cleaned_embalagem),
                "purchase_unit": "un",
                "section": row[columns.get("secao")],
                "package_units": clean_decimal(row[columns.get("unidades")]),
                "purchase_cost": clean_decimal(row[columns.get("custo")]),
                "unit_cost_reference": clean_decimal(row[columns.get("ct unit")]),
                "updated_at": as_iso_date(row[columns.get("data atualizacao")]),
            }
        )

    return rows

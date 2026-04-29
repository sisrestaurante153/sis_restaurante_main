from __future__ import annotations

from typing import Any

from ..normalize import normalize_name


def parse_pesos_sheet(worksheet) -> list[dict[str, Any]]:
    rows = list(worksheet.iter_rows(values_only=True))
    header_index = None
    for index, row in enumerate(rows):
        normalized = [normalize_name(value) for value in row if value is not None]
        if any(value.startswith("p ") for value in normalized) and any(
            value.startswith("m ") for value in normalized
        ):
            header_index = index
            break

    if header_index is None:
        raise ValueError("PESOS header not found")

    data: list[dict[str, Any]] = []
    for row_index, row in enumerate(rows[header_index + 1 :], start=header_index + 2):
        if row[0] is None:
            continue
        if normalize_name(row[0]).startswith("produto"):
            break

        label = normalize_name(row[0])
        if not label:
            continue

        data.append(
            {
                "sheet_name": worksheet.title,
                "row_number": row_index,
                "label": label,
                "p": row[1],
                "m": row[2],
                "g": row[3],
            }
        )

    return data

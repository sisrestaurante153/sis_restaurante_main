from __future__ import annotations

from typing import Any

from ..normalize import normalize_header, normalize_name, normalize_unit


SUMMARY_MARKERS = {
    "peso total bruto",
    "peso total limpo",
    "peso pos coccao",
    "fator coccao da receita bruto",
    "fator coccao da receita limpo",
}


def _extract_label_value(rows: list[list[Any]], label: str) -> Any:
    wanted = normalize_header(label)
    for row in rows:
        for index, value in enumerate(row[:-1]):
            if normalize_header(value) == wanted:
                return row[index + 1]
    return None


def _find_ingredient_header(rows: list[list[Any]]) -> tuple[int, dict[str, int]]:
    for index, row in enumerate(rows):
        normalized = [normalize_header(value) for value in row]
        if "ingredientes" in normalized:
            return index, {value: idx for idx, value in enumerate(normalized) if value}
    raise ValueError("Ingredient header not found")


def _parse_ingredient_rows(rows: list[list[Any]], header_index: int, columns: dict[str, int]):
    ingredients: list[dict[str, Any]] = []
    packaging: list[dict[str, Any]] = []
    in_packaging_section = False
    packaging_columns: dict[str, int] | None = None

    for offset, row in enumerate(rows[header_index + 1 :], start=header_index + 2):
        ingredient_name = row[columns.get("ingredientes", 0)] if columns else None
        normalized_name = normalize_name(ingredient_name)

        if normalized_name in SUMMARY_MARKERS:
            break

        if any(
            isinstance(value, str) and "embalagens somente restaurante delivery" in normalize_name(value)
            for value in row
        ):
            in_packaging_section = True
            continue

        if in_packaging_section:
            normalized_row = [normalize_header(value) for value in row]
            if {"tipo", "qt", "ct unit"}.issubset(set(normalized_row)):
                packaging_columns = {
                    value: index for index, value in enumerate(normalized_row) if value
                }
                continue

            if not packaging_columns:
                continue

            packaging_name = row[packaging_columns.get("tipo", -1)] if len(row) > 0 else None
            if packaging_name in (None, "Total", "#N/A"):
                continue

            packaging.append(
                {
                    "source_row": offset,
                    "raw_name": str(packaging_name).strip(),
                    "normalized_name": normalize_name(packaging_name),
                    "quantity": row[packaging_columns.get("qt", -1)],
                    "unit_cost": row[packaging_columns.get("ct unit", -1)],
                    "unit": "un",
                }
            )
            continue

        if not ingredient_name:
            continue

        ingredients.append(
            {
                "source_row": offset,
                "raw_name": str(ingredient_name).strip(),
                "normalized_name": normalized_name,
                "gross_weight": row[columns.get("peso bruto")] if "peso bruto" in columns else None,
                "net_weight": row[columns.get("peso limpo")] if "peso limpo" in columns else None,
                "unit": normalize_unit(row[columns.get("un")] if "un" in columns else None),
                "unit_cost": row[columns.get("custo unitario")] if "custo unitario" in columns else None,
                "fc": row[columns.get("fc")] if "fc" in columns else None,
                "ic": row[columns.get("ic")] if "ic" in columns else None,
                "input_cost": row[columns.get("custo insumo")] if "custo insumo" in columns else None,
            }
        )

    return ingredients, packaging


def parse_ficha_sheet(worksheet, recipe_kind: str) -> dict[str, Any]:
    rows = [list(row) for row in worksheet.iter_rows(max_row=60, max_col=16, values_only=True)]
    product_name = _extract_label_value(rows, "Produto")
    sheet_product_name = str(product_name).strip() if product_name else worksheet.title
    result_item_name = worksheet.title if recipe_kind == "final_composition" else sheet_product_name
    yield_value = _extract_label_value(rows, "Rendimento em proções")
    if yield_value is None:
        yield_value = _extract_label_value(rows, "Rendimento em porções")

    header_index, columns = _find_ingredient_header(rows)
    ingredients, packaging = _parse_ingredient_rows(rows, header_index, columns)

    return {
        "sheet_name": worksheet.title,
        "sheet_product_name": sheet_product_name,
        "result_item_name": result_item_name,
        "normalized_product_name": normalize_name(result_item_name),
        "recipe_kind": recipe_kind,
        "yield_value": yield_value,
        "ingredient_components": ingredients,
        "packaging_components": packaging,
        "source_trace": {
            "sheet_name": worksheet.title,
            "ingredient_header_row": header_index + 1,
        },
    }

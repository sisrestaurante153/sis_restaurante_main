from __future__ import annotations

import json
import re
from collections import Counter
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .normalize import (
    is_forced_pending_conflict,
    normalize_name,
    normalize_unit,
    reconciliation_score,
    units_are_compatible,
)
from .parsers.ficha import parse_ficha_sheet
from .parsers.pesos import parse_pesos_sheet
from .parsers.tabular import parse_embalagens_sheet, parse_vmarket_sheet
from .workbook import classify_sheet, inspect_workbook, open_workbook, preview_rows


HIGH_CONFIDENCE_THRESHOLD = 0.97
EMBEDDED_MEASURE_RE = re.compile(r"(\d+(?:[.,]\d+)?)\s*(kg|g|ml|l|litro|litros)\b", re.IGNORECASE)


def infer_item_type(recipe_kind: str, product_name: str, sheet_name: str) -> str:
    normalized_product = normalize_name(product_name)
    normalized_sheet = normalize_name(sheet_name)

    if recipe_kind == "recipe":
        return "intermediario"

    if normalized_product.startswith("marmita ") or normalized_sheet.startswith("marmita "):
        return "marmita"
    if normalized_product.startswith("porcao ") or normalized_sheet.startswith("porcao "):
        return "porcao"
    if normalized_product.startswith("combo "):
        return "combo"
    if normalized_product.startswith("prato "):
        return "prato"
    if "especial " in normalized_product or normalized_sheet.endswith((" p", " m", " g")):
        return "marmita"
    if normalized_product.startswith("salada "):
        return "produto_pronto"
    return "produto_pronto"


def build_catalog_index(items: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    return {item["canonical_name"]: item for item in items}


def ensure_catalog_item(
    catalog: dict[str, dict[str, Any]],
    staging_items: list[dict[str, Any]],
    display_name: str,
    sheet_name: str,
    item_type: str,
):
    canonical_name = normalize_name(display_name)
    existing = catalog.get(canonical_name)
    if existing:
        return existing

    record = {
        "source_kind": "sheet_product",
        "sheet_name": sheet_name,
        "row_number": 2,
        "display_name": display_name.strip(),
        "canonical_name": canonical_name,
        "item_type": item_type,
        "purchase_unit": None,
        "purchase_cost": None,
        "unit_cost_reference": None,
    }
    staging_items.append(record)
    catalog[canonical_name] = record
    return record


def parse_embedded_measure(value: str) -> tuple[float, str] | None:
    match = EMBEDDED_MEASURE_RE.search(value)
    if not match:
        return None

    raw_amount = match.group(1).replace(",", ".")
    amount = float(raw_amount)
    unit = normalize_unit(match.group(2))

    if not unit:
        return None

    return amount, unit


def convert_measure_to_unit(amount: float, source_unit: str, target_unit: str) -> float | None:
    if source_unit == target_unit:
        return amount

    conversions = {
        ("g", "kg"): 0.001,
        ("kg", "g"): 1000.0,
        ("ml", "l"): 0.001,
        ("l", "ml"): 1000.0,
    }

    factor = conversions.get((source_unit, target_unit))
    if factor is None:
        return None

    return amount * factor


def is_safe_embedded_measure(amount: float, unit: str) -> bool:
    if unit in {"g", "ml"} and amount < 5:
        return False

    return amount > 0


def infer_usage_conversion(item: dict[str, Any], source_unit: str | None) -> dict[str, Any] | None:
    purchase_unit = item.get("purchase_unit")
    normalized_source_unit = normalize_unit(source_unit)
    if purchase_unit not in {"un", "maço"} or not normalized_source_unit:
        return None

    embedded = parse_embedded_measure(item["display_name"])
    if not embedded:
        return None

    embedded_amount, embedded_unit = embedded
    if not is_safe_embedded_measure(embedded_amount, embedded_unit):
        return None

    if not units_are_compatible(normalized_source_unit, embedded_unit):
        return None

    converted_amount = convert_measure_to_unit(
        embedded_amount, embedded_unit, normalized_source_unit
    )
    if converted_amount is None or converted_amount <= 0:
        return None

    return {
        "usage_unit": normalized_source_unit,
        "purchase_to_usage_factor": round(converted_amount, 6),
    }


def ensure_item_usage_unit(item: dict[str, Any], source_unit: str | None) -> dict[str, Any]:
    if item.get("usage_unit"):
        return item

    inferred = infer_usage_conversion(item, source_unit)
    if not inferred:
        return item

    item.update(inferred)
    purchase_cost = item.get("purchase_cost")
    factor = item.get("purchase_to_usage_factor")
    if purchase_cost is not None and factor:
        item["unit_cost_reference"] = round(float(purchase_cost) / float(factor), 6)

    return item


def _best_match(name: str, catalog: dict[str, dict[str, Any]]):
    scored = [
        (reconciliation_score(name, candidate["display_name"]), candidate)
        for candidate in catalog.values()
    ]
    scored.sort(key=lambda pair: pair[0], reverse=True)
    return scored[0] if scored else (0.0, None)


def resolve_reference(
    raw_name: str,
    source_unit: str | None,
    catalog: dict[str, dict[str, Any]],
    aliases: list[dict[str, Any]],
    conflicts: list[dict[str, Any]],
    context: dict[str, Any],
):
    normalized_name = normalize_name(raw_name)

    if is_forced_pending_conflict(raw_name):
        conflicts.append(
            {
                "type": "forced_manual_review",
                "raw_name": raw_name,
                "normalized_name": normalized_name,
                **context,
            }
        )
        return None

    direct = catalog.get(normalized_name)
    if direct:
        ensure_item_usage_unit(direct, source_unit)
        if normalize_name(direct["display_name"]) != normalized_name:
            aliases.append(
                {
                    "canonical_name": direct["canonical_name"],
                    "alias": raw_name,
                    "confidence": 1.0,
                    **context,
                }
            )
        target_unit = direct.get("usage_unit") or direct.get("purchase_unit")
        if not units_are_compatible(source_unit, target_unit):
            conflicts.append(
                {
                    "type": "unit_mismatch",
                    "raw_name": raw_name,
                    "normalized_name": normalized_name,
                    "source_unit": source_unit,
                    "catalog_unit": target_unit,
                    **context,
                }
            )
            return None
        return direct

    score, best = _best_match(raw_name, catalog)
    if best and score >= HIGH_CONFIDENCE_THRESHOLD:
        ensure_item_usage_unit(best, source_unit)
        aliases.append(
            {
                "canonical_name": best["canonical_name"],
                "alias": raw_name,
                "confidence": round(score, 4),
                **context,
            }
        )
        target_unit = best.get("usage_unit") or best.get("purchase_unit")
        if not units_are_compatible(source_unit, target_unit):
            conflicts.append(
                {
                    "type": "unit_mismatch",
                    "raw_name": raw_name,
                    "normalized_name": normalized_name,
                    "source_unit": source_unit,
                    "catalog_unit": target_unit,
                    **context,
                }
            )
            return None
        return best

    conflicts.append(
        {
            "type": "name_conflict",
            "raw_name": raw_name,
            "normalized_name": normalized_name,
            "best_candidate": best["display_name"] if best else None,
            "confidence": round(score, 4),
            **context,
        }
    )
    return None


def write_report(output_dir: Path, report: dict[str, Any]) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    staging_dir = output_dir / "staging"
    staging_dir.mkdir(parents=True, exist_ok=True)

    (output_dir / "report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (output_dir / "conflicts.json").write_text(
        json.dumps(report["conflicts"], ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (staging_dir / "items.json").write_text(
        json.dumps(report["staging"]["items"], ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (staging_dir / "recipes.json").write_text(
        json.dumps(report["staging"]["recipes"], ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (staging_dir / "weights.json").write_text(
        json.dumps(report["staging"]["weights"], ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    summary = report["summary"]
    lines = [
        "# Relatório de Importação Legada",
        "",
        f"- Arquivo: `{report['source_workbook']}`",
        f"- Executado em: `{report['executed_at']}`",
        f"- Itens em staging: `{summary['staged_items']}`",
        f"- Fichas em staging: `{summary['staged_recipes']}`",
        f"- Aliases gerados: `{summary['generated_aliases']}`",
        f"- Conflitos: `{summary['conflicts']}`",
        "",
        "## Conflitos por tipo",
        "",
    ]

    counter = Counter(conflict["type"] for conflict in report["conflicts"])
    for conflict_type, count in sorted(counter.items()):
        lines.append(f"- `{conflict_type}`: {count}")

    (output_dir / "report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def rewire_self_transform_recipes(
    catalog: dict[str, dict[str, Any]],
    staging_items: list[dict[str, Any]],
    staging_recipes: list[dict[str, Any]],
    aliases: list[dict[str, Any]],
) -> None:
    for recipe in staging_recipes:
        result_canonical = recipe["normalized_product_name"]
        self_references = [
            component
            for component in recipe["ingredient_components"]
            if component.get("resolved_canonical_name") == result_canonical
        ]

        if not self_references:
            continue

        derived_display_name = f"{recipe['result_item_name']} preparado"
        derived_item = ensure_catalog_item(
            catalog,
            staging_items,
            derived_display_name,
            recipe["sheet_name"],
            infer_item_type(recipe["recipe_kind"], derived_display_name, recipe["sheet_name"]),
        )

        recipe["result_item_name"] = derived_display_name
        recipe["normalized_product_name"] = derived_item["canonical_name"]
        aliases.append(
            {
                "canonical_name": derived_item["canonical_name"],
                "alias": recipe["sheet_name"],
                "confidence": 1.0,
                "sheet_name": recipe["sheet_name"],
                "row_number": 2,
            }
        )

        for downstream_recipe in staging_recipes:
            if downstream_recipe is recipe:
                continue

            for component in downstream_recipe["ingredient_components"]:
                if component.get("resolved_canonical_name") == result_canonical:
                    component["resolved_canonical_name"] = derived_item["canonical_name"]


def run_import(workbook_path: Path, output_dir: Path | None = None) -> dict[str, Any]:
    inventory = inspect_workbook(workbook_path)
    workbook = open_workbook(workbook_path)

    staging_items: list[dict[str, Any]] = []
    staging_recipes: list[dict[str, Any]] = []
    staging_weights: list[dict[str, Any]] = []
    aliases: list[dict[str, Any]] = []
    conflicts: list[dict[str, Any]] = []

    for sheet in inventory["sheets"]:
        worksheet = workbook[sheet["name"]]
        if sheet["kind"] == "vmarket":
            for item in parse_vmarket_sheet(worksheet):
                item["item_type"] = "insumo"
                staging_items.append(item)
        elif sheet["kind"] == "embalagens":
            for item in parse_embalagens_sheet(worksheet):
                item["item_type"] = "embalagem"
                staging_items.append(item)
        elif sheet["kind"] == "pesos":
            staging_weights.extend(parse_pesos_sheet(worksheet))

    catalog = build_catalog_index(staging_items)

    for sheet in inventory["sheets"]:
        worksheet = workbook[sheet["name"]]
        if sheet["kind"] not in {"recipe", "final_composition"}:
            continue

        parsed = parse_ficha_sheet(worksheet, recipe_kind=sheet["kind"])
        ensure_catalog_item(
            catalog,
            staging_items,
            parsed["result_item_name"],
            parsed["sheet_name"],
            infer_item_type(sheet["kind"], parsed["result_item_name"], parsed["sheet_name"]),
        )

        sheet_alias = normalize_name(parsed["result_item_name"]) != normalize_name(parsed["sheet_name"])
        if sheet_alias:
            aliases.append(
                {
                    "canonical_name": parsed["normalized_product_name"],
                    "alias": parsed["sheet_name"],
                    "confidence": 1.0,
                    "sheet_name": parsed["sheet_name"],
                    "row_number": 2,
                }
            )

        staging_recipes.append(parsed)

    for recipe in staging_recipes:
        for component in recipe["ingredient_components"]:
            matched = resolve_reference(
                component["raw_name"],
                component["unit"],
                catalog,
                aliases,
                conflicts,
                {
                    "sheet_name": recipe["sheet_name"],
                    "row_number": component["source_row"],
                    "component_kind": "ingredient",
                },
            )
            component["resolved_canonical_name"] = matched["canonical_name"] if matched else None

        for component in recipe["packaging_components"]:
            matched = resolve_reference(
                component["raw_name"],
                component["unit"],
                catalog,
                aliases,
                conflicts,
                {
                    "sheet_name": recipe["sheet_name"],
                    "row_number": component["source_row"],
                    "component_kind": "packaging",
                },
            )
            component["resolved_canonical_name"] = matched["canonical_name"] if matched else None

    rewire_self_transform_recipes(catalog, staging_items, staging_recipes, aliases)

    report = {
        "source_workbook": str(workbook_path),
        "executed_at": datetime.now(timezone.utc).isoformat(),
        "inventory": inventory,
        "summary": {
            "staged_items": len(staging_items),
            "staged_recipes": len(staging_recipes),
            "generated_aliases": len(aliases),
            "conflicts": len(conflicts),
        },
        "staging": {
            "items": staging_items,
            "recipes": staging_recipes,
            "weights": staging_weights,
        },
        "aliases": aliases,
        "conflicts": conflicts,
    }

    if output_dir is not None:
        write_report(output_dir, report)

    return report

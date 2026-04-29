import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "vendor/python"))
sys.path.insert(0, str(ROOT))

from scripts.importers.legacy_excel.pipeline import run_import  # type: ignore  # noqa: E402
from scripts.importers.legacy_excel.workbook import inspect_workbook  # type: ignore  # noqa: E402


WORKBOOK_PATH = ROOT / "fichas-tecnicas-produtos-oficial.xlsx"


class LegacyWorkbookParserRealSamplesTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.inventory = inspect_workbook(WORKBOOK_PATH)
        cls.result = run_import(WORKBOOK_PATH, output_dir=ROOT / "artifacts" / "imports" / "test-run")

    def test_detects_required_sheet_families(self):
        summary = self.inventory["summary"]
        self.assertEqual(summary["vmarket_sheets"], 1)
        self.assertEqual(summary["embalagens_sheets"], 1)
        self.assertEqual(summary["pesos_sheets"], 1)
        self.assertGreater(summary["recipe_sheet_candidates"], 100)
        self.assertGreater(summary["final_sheet_candidates"], 20)

    def test_extracts_vmarket_and_embalagens_samples(self):
        items = self.result["staging"]["items"]
        canonical_names = {item["canonical_name"] for item in items}
        self.assertIn("abacaxi congelado pct 1 kg cx c 12 kg", canonical_names)
        self.assertIn("marmita isopor grande", canonical_names)

    def test_extracts_final_composition_with_packaging(self):
        recipes = self.result["staging"]["recipes"]
        prato = next(recipe for recipe in recipes if recipe["sheet_name"] == "PRATO STROGONOFF")
        self.assertEqual(prato["recipe_kind"], "final_composition")
        self.assertGreaterEqual(len(prato["packaging_components"]), 5)

    def test_final_composition_uses_sheet_name_as_result_item(self):
        recipes = self.result["staging"]["recipes"]
        marmita = next(recipe for recipe in recipes if recipe["sheet_name"] == "MARMITA FEIJOADA")
        self.assertEqual(marmita["recipe_kind"], "final_composition")
        self.assertEqual(marmita["sheet_product_name"], "Feijoada")
        self.assertEqual(marmita["normalized_product_name"], "marmita feijoada")

    def test_recipes_do_not_reference_their_own_result_item(self):
        recipes = self.result["staging"]["recipes"]
        self_referencing = []

        for recipe in recipes:
            resolved_components = {
                component.get("resolved_canonical_name")
                for component in recipe["ingredient_components"]
                if component.get("resolved_canonical_name")
            }
            if recipe["normalized_product_name"] in resolved_components:
                self_referencing.append(recipe["sheet_name"])

        self.assertEqual(self_referencing, [])

    def test_safe_embedded_package_size_infers_usage_unit(self):
        items = self.result["staging"]["items"]
        alho = next(
            item
            for item in items
            if item["canonical_name"] == "alho fresco triturado balde 3kg mais claro"
        )

        self.assertEqual(alho["purchase_unit"], "un")
        self.assertEqual(alho.get("usage_unit"), "kg")
        self.assertAlmostEqual(alho.get("purchase_to_usage_factor"), 3.0)

        conflicts = [
          conflict
          for conflict in self.result["conflicts"]
          if conflict.get("normalized_name") == "alho fresco triturado balde 3kg mais claro"
        ]
        self.assertEqual(conflicts, [])

    def test_ambiguous_embedded_package_size_stays_pending(self):
        conflicts = [
            conflict
            for conflict in self.result["conflicts"]
            if conflict.get("normalized_name")
            == "ovo branco de galinha tipo extra 0 65g cx c 360 un"
        ]
        self.assertGreater(len(conflicts), 0)

    def test_known_pending_conflicts_are_forced_to_manual_queue(self):
        conflicts = self.result["conflicts"]
        pending_names = {conflict["raw_name"] for conflict in conflicts}
        self.assertIn("Batata lavada  graúda  un aproxim. 350g", pending_names)
        self.assertIn("Bicarbonato", pending_names)


if __name__ == "__main__":
    unittest.main()

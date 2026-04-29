import { describe, expect, it } from "vitest";
import {
  inferOperationalItemColumnMapping,
  parseOperationalItemsCsv
} from "@/modules/import/domain/operational-item-import";

describe("operational item import", () => {
  it("infers the expected mapping from operational CSV headers", () => {
    const mapping = inferOperationalItemColumnMapping([
      "Nome do Item",
      "Tipo",
      "Categoria Operacional (Secao)",
      "Unidade de Compra",
      "Quantidade de Compra",
      "Preco de Compra",
      "Fator de Conversao",
      "Unidade de Uso",
      "Quantidade de Uso",
      "Preco de Uso",
      "Data e Hora da Ultima Atualizacao",
      "Indicador de descricao operacional"
    ]);

    expect(mapping.itemName).toBe("Nome do Item");
    expect(mapping.type).toBe("Tipo");
    expect(mapping.operationalCategory).toBe("Categoria Operacional (Secao)");
    expect(mapping.updatedAt).toBe("Data e Hora da Ultima Atualizacao");
  });

  it("parses semicolon CSV rows into normalized operational item payloads", () => {
    const result = parseOperationalItemsCsv(
      [
        "Nome do Item;Tipo;Categoria Operacional (Secao);Unidade de Compra;Quantidade de Compra;Preco de Compra;Fator de Conversao;Unidade de Uso;Quantidade de Uso;Preco de Uso;Data e Hora da Ultima Atualizacao;Indicador de descricao operacional",
        "Arroz integral;insumo;Graos;kg;1.0000;8.9000;1000.0000;g;1000.0000;0.0089;2026-03-27T10:30:00-03:00;sim"
      ].join("\n")
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      itemName: "Arroz integral",
      type: "insumo",
      operationalCategory: "Graos",
      purchaseUnit: "kg",
      purchaseQuantity: "1.0000",
      purchaseCost: "8.9000",
      conversionFactor: "1000.0000",
      usageUnit: "g",
      updatedAt: "2026-03-27T10:30:00-03:00",
      descriptionFlag: true
    });
  });
});

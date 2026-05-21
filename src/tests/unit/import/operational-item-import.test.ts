import { describe, expect, it } from "vitest";
import {
  parseOperationalItemsCsv,
  inferOperationalItemColumnMapping
} from "@/modules/import/domain/operational-item-import";

describe("inferOperationalItemColumnMapping", () => {
  it("mapeia cabeçalhos em português exato", () => {
    const mapping = inferOperationalItemColumnMapping([
      "Nome do Item",
      "Tipo",
      "Unidade de Compra",
      "Quantidade de Compra",
      "Preco de Compra"
    ]);
    expect(mapping.itemName).toBe("Nome do Item");
    expect(mapping.type).toBe("Tipo");
    expect(mapping.purchaseUnit).toBe("Unidade de Compra");
  });

  it("mapeia com alias alternativos", () => {
    const mapping = inferOperationalItemColumnMapping(["Item", "Un Compra"]);
    expect(mapping.itemName).toBe("Item");
    expect(mapping.purchaseUnit).toBe("Un Compra");
  });

  it("retorna null para colunas não encontradas", () => {
    const mapping = inferOperationalItemColumnMapping(["Coluna Estranha"]);
    expect(mapping.itemName).toBeNull();
    expect(mapping.type).toBeNull();
  });

  it("ignora acentos nos cabeçalhos", () => {
    const mapping = inferOperationalItemColumnMapping(["Seção"]);
    expect(mapping.operationalCategory).not.toBeNull();
  });
});

describe("parseOperationalItemsCsv", () => {
  it("CSV vazio retorna arrays vazios", () => {
    const result = parseOperationalItemsCsv("");
    expect(result.rows).toHaveLength(0);
    expect(result.headers).toHaveLength(0);
  });

  it("detecta delimitador ponto-e-vírgula", () => {
    const csv = "Nome do Item;Tipo\nFrango;insumo\nArroz;insumo";
    const result = parseOperationalItemsCsv(csv);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].itemName).toBe("Frango");
    expect(result.rows[0].type).toBe("insumo");
  });

  it("detecta delimitador vírgula", () => {
    const csv = "Nome do Item,Tipo\nFrango,insumo";
    const result = parseOperationalItemsCsv(csv);
    expect(result.rows[0].itemName).toBe("Frango");
  });

  it("lida com quebras de linha Windows (CRLF)", () => {
    const csv = "Nome do Item;Tipo\r\nFrango;insumo\r\nArroz;insumo";
    const result = parseOperationalItemsCsv(csv);
    expect(result.rows).toHaveLength(2);
  });

  it("lida com células entre aspas contendo delimitador", () => {
    const csv = `Nome do Item;Tipo\n"Frango, Grelhado";insumo`;
    const result = parseOperationalItemsCsv(csv);
    expect(result.rows[0].itemName).toBe("Frango, Grelhado");
  });

  it("campo descriptionFlag: '1' → true", () => {
    const csv = "Nome do Item;Indicador de Descricao Operacional\nFrango;1";
    const result = parseOperationalItemsCsv(csv);
    expect(result.rows[0].descriptionFlag).toBe(true);
  });

  it("campo descriptionFlag: 'sim' → true", () => {
    const csv = "Nome do Item;Indicador de Descricao Operacional\nFrango;sim";
    const result = parseOperationalItemsCsv(csv);
    expect(result.rows[0].descriptionFlag).toBe(true);
  });

  it("campo descriptionFlag: '0' → false", () => {
    const csv = "Nome do Item;Indicador de Descricao Operacional\nFrango;0";
    const result = parseOperationalItemsCsv(csv);
    expect(result.rows[0].descriptionFlag).toBe(false);
  });

  it("campo não mapeado retorna string vazia", () => {
    const csv = "Nome do Item;Tipo\nFrango;insumo";
    const result = parseOperationalItemsCsv(csv);
    expect(result.rows[0].purchaseCost).toBe("");
    expect(result.rows[0].purchaseUnit).toBe("");
  });

  it("múltiplas linhas preservam ordem", () => {
    const csv = "Nome do Item;Tipo\nFrango;insumo\nArroz;insumo\nFeijao;insumo";
    const result = parseOperationalItemsCsv(csv);
    expect(result.rows[0].itemName).toBe("Frango");
    expect(result.rows[1].itemName).toBe("Arroz");
    expect(result.rows[2].itemName).toBe("Feijao");
  });

  it("retorna o mapping usado no resultado", () => {
    const csv = "Nome do Item;Tipo\nFrango;insumo";
    const result = parseOperationalItemsCsv(csv);
    expect(result.mapping.itemName).toBe("Nome do Item");
    expect(result.mapping.type).toBe("Tipo");
  });
});

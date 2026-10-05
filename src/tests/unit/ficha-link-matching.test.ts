import { describe, expect, it } from "vitest";
import { rankFichaCandidates } from "@/modules/engineering/domain/ficha-link-matching";

const CANDIDATES = [
  { itemId: "1", itemName: "Arroz Branco", fichaId: "f1" },
  { itemId: "2", itemName: "Porção arroz integral", fichaId: "f2" },
  { itemId: "3", itemName: "Prestigio", fichaId: "f3" }
];

describe("rankFichaCandidates", () => {
  it("classifica como match forte quando o score e alto", () => {
    const result = rankFichaCandidates("Arroz Branco 200g", CANDIDATES);
    expect(result[0].itemName).toBe("Arroz Branco");
    expect(result[0].strength).toBe("forte");
  });

  it("classifica como match fraco na faixa intermediaria", () => {
    const result = rankFichaCandidates("Cupim Assado 380g", [{ itemId: "4", itemName: "Cupim", fichaId: "f4" }]);
    expect(result[0]?.strength).toBe("fraco");
  });

  it("exclui candidatas abaixo do piso minimo", () => {
    const result = rankFichaCandidates("Arroz Branco 200g", CANDIDATES);
    expect(result.find((candidate) => candidate.itemName === "Prestigio")).toBeUndefined();
  });

  it("limita ao numero maximo de candidatas", () => {
    const many = Array.from({ length: 10 }, (_, index) => ({
      itemId: String(index),
      itemName: "Arroz Branco",
      fichaId: `f${index}`
    }));
    const result = rankFichaCandidates("Arroz Branco", many, 3);
    expect(result).toHaveLength(3);
  });

  it("ordena por score decrescente e depois por nome", () => {
    const result = rankFichaCandidates("Arroz Branco 200g", CANDIDATES);
    const scores = result.map((candidate) => candidate.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });
});

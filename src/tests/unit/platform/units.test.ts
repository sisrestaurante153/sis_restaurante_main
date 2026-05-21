import { describe, expect, it, vi } from "vitest";

vi.mock("@/generated/prisma/client", async () => {
  const Decimal = (await import("decimal.js")).default;
  return {
    Prisma: { Decimal },
    unidade_tipo: { massa: "massa", volume: "volume", contagem: "contagem" }
  };
});

const {
  normalizeUnitCode,
  inferUnitTypeFromCode,
  getCanonicalFactor,
  normalizeQuantityToCanonical,
  denormalizeQuantityFromCanonical,
  calculateCanonicalUnitCost
} = await import("@/modules/platform/domain/units");

describe("normalizeUnitCode", () => {
  it("remove espaços e converte para minúsculo", () => {
    expect(normalizeUnitCode("  KG  ")).toBe("kg");
    expect(normalizeUnitCode("ML")).toBe("ml");
  });
});

describe("inferUnitTypeFromCode", () => {
  it("kg → massa", () => expect(inferUnitTypeFromCode("kg")).toBe("massa"));
  it("g → massa", () => expect(inferUnitTypeFromCode("g")).toBe("massa"));
  it("l → volume", () => expect(inferUnitTypeFromCode("l")).toBe("volume"));
  it("ml → volume", () => expect(inferUnitTypeFromCode("ml")).toBe("volume"));
  it("un → contagem", () => expect(inferUnitTypeFromCode("un")).toBe("contagem"));
  it("unidade → contagem", () => expect(inferUnitTypeFromCode("unidade")).toBe("contagem"));
  it("desconhecido → contagem (fallback)", () => expect(inferUnitTypeFromCode("cx")).toBe("contagem"));
});

describe("getCanonicalFactor", () => {
  it("kg → 1", () => expect(getCanonicalFactor("kg").toNumber()).toBe(1));
  it("g → 0.001", () => expect(getCanonicalFactor("g").toNumber()).toBe(0.001));
  it("mg → 0.000001", () => expect(getCanonicalFactor("mg").toNumber()).toBe(0.000001));
  it("l → 1", () => expect(getCanonicalFactor("l").toNumber()).toBe(1));
  it("ml → 0.001", () => expect(getCanonicalFactor("ml").toNumber()).toBe(0.001));
  it("un → 1", () => expect(getCanonicalFactor("un").toNumber()).toBe(1));
  it("desconhecido → 1 (fallback)", () => expect(getCanonicalFactor("caixa").toNumber()).toBe(1));
});

describe("normalizeQuantityToCanonical", () => {
  it("500g → 0.5 kg canônico", () => {
    expect(normalizeQuantityToCanonical("500", "g").toNumber()).toBe(0.5);
  });

  it("1kg → 1", () => {
    expect(normalizeQuantityToCanonical("1", "kg").toNumber()).toBe(1);
  });

  it("1000ml → 1 litro canônico", () => {
    expect(normalizeQuantityToCanonical("1000", "ml").toNumber()).toBe(1);
  });

  it("5un → 5", () => {
    expect(normalizeQuantityToCanonical("5", "un").toNumber()).toBe(5);
  });
});

describe("denormalizeQuantityFromCanonical", () => {
  it("0.5kg canônico → 500g", () => {
    expect(denormalizeQuantityFromCanonical("0.5", "g").toNumber()).toBe(500);
  });

  it("1 canônico → 1kg", () => {
    expect(denormalizeQuantityFromCanonical("1", "kg").toNumber()).toBe(1);
  });
});

describe("calculateCanonicalUnitCost", () => {
  it("R$10 por 1kg → R$10/kg", () => {
    expect(calculateCanonicalUnitCost("10", "1", "kg").toNumber()).toBe(10);
  });

  it("R$5 por 500g → R$10/kg", () => {
    expect(calculateCanonicalUnitCost("5", "500", "g").toNumber()).toBe(10);
  });

  it("R$3 por 1L → R$3/L", () => {
    expect(calculateCanonicalUnitCost("3", "1", "l").toNumber()).toBe(3);
  });

  it("R$6 por 2L → R$3/L", () => {
    expect(calculateCanonicalUnitCost("6", "2", "l").toNumber()).toBe(3);
  });

  it("quantidade zero retorna 0 (evita divisão por zero)", () => {
    expect(calculateCanonicalUnitCost("10", "0", "kg").toNumber()).toBe(0);
  });

  it("R$2 por 1un → R$2/un", () => {
    expect(calculateCanonicalUnitCost("2", "1", "un").toNumber()).toBe(2);
  });
});

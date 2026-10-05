import { describe, expect, it } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { computeScaleFactor, scaleFichaFields } from "@/modules/engineering/domain/ficha-link-scaling";
import { DomainInvariantError } from "@/modules/engineering/domain/errors";

describe("computeScaleFactor", () => {
  it("calcula a razao entre peso alvo e rendimento de origem", () => {
    const factor = computeScaleFactor({ targetWeightGrams: 200, sourceYieldGrams: 1000 });
    expect(factor.toNumber()).toBeCloseTo(0.2);
  });

  it("lanca erro quando o rendimento de origem e zero ou negativo", () => {
    expect(() => computeScaleFactor({ targetWeightGrams: 200, sourceYieldGrams: 0 })).toThrow(DomainInvariantError);
  });

  it("lanca erro quando o peso alvo e zero ou negativo", () => {
    expect(() => computeScaleFactor({ targetWeightGrams: 0, sourceYieldGrams: 1000 })).toThrow(DomainInvariantError);
  });
});

describe("scaleFichaFields", () => {
  const factor = new Prisma.Decimal(0.2);

  it("escala peso final apenas no modo peso_final", () => {
    const result = scaleFichaFields(
      {
        modoRendimento: "peso_final",
        pesoFinal: new Prisma.Decimal(1000),
        rendimentoPorcoes: new Prisma.Decimal(5),
        componentes: [{ cd_ficha_componente: "a", vl_qtd_bruta: new Prisma.Decimal(500), vl_qtd_limpa: new Prisma.Decimal(450) }]
      },
      factor
    );

    expect(result.pesoFinal?.toNumber()).toBe(200);
    expect(result.rendimentoPorcoes?.toNumber()).toBe(1);
    expect(result.componentes[0].vl_qtd_bruta.toNumber()).toBe(100);
    expect(result.componentes[0].vl_qtd_limpa?.toNumber()).toBe(90);
  });

  it("nao escala peso final no modo percentual_perda (campo e null/irrelevante)", () => {
    const result = scaleFichaFields(
      {
        modoRendimento: "percentual_perda",
        pesoFinal: null,
        rendimentoPorcoes: new Prisma.Decimal(10),
        componentes: [{ cd_ficha_componente: "a", vl_qtd_bruta: new Prisma.Decimal(1000), vl_qtd_limpa: null }]
      },
      factor
    );

    expect(result.pesoFinal).toBeNull();
    expect(result.rendimentoPorcoes?.toNumber()).toBe(2);
    expect(result.componentes[0].vl_qtd_bruta.toNumber()).toBe(200);
    expect(result.componentes[0].vl_qtd_limpa).toBeNull();
  });
});

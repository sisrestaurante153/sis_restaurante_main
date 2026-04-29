import { describe, expect, it } from "vitest";
import {
  DomainInvariantError,
  assertFichaTecnicaInvariants,
  assertSingleActiveFicha
} from "@/modules/engineering/domain/ficha-tecnica";

describe("ficha tecnica invariants", () => {
  it("requires percentual de perda only for percentual mode", () => {
    expect(() =>
      assertFichaTecnicaInvariants({
        itemResultanteId: "molho",
        versao: 1,
        status: "rascunho",
        modoRendimento: "percentual_perda",
        pesoFinalInformado: "1.5000",
        componentes: [{ ordem: 1, quantidadeBruta: "1.0000" }]
      })
    ).toThrow(DomainInvariantError);
  });

  it("requires peso final only for peso final mode", () => {
    expect(() =>
      assertFichaTecnicaInvariants({
        itemResultanteId: "molho",
        versao: 1,
        status: "rascunho",
        modoRendimento: "peso_final",
        percentualPerda: "0.1200",
        componentes: [{ ordem: 1, quantidadeBruta: "1.0000" }]
      })
    ).toThrow("peso final");
  });

  it("rejects duplicate component order and non-positive quantity", () => {
    expect(() =>
      assertFichaTecnicaInvariants({
        itemResultanteId: "molho",
        versao: 1,
        status: "rascunho",
        modoRendimento: "percentual_perda",
        percentualPerda: "0.1000",
        componentes: [
          { ordem: 1, quantidadeBruta: "1.0000" },
          { ordem: 1, quantidadeBruta: "0.0000" }
        ]
      })
    ).toThrow(DomainInvariantError);
  });

  it("rejects a second active ficha version for the same item", () => {
    expect(() =>
      assertSingleActiveFicha({
        itemResultanteId: "molho",
        status: "ativa",
        existingActiveVersions: [1],
        versaoAtual: 2
      })
    ).toThrow("ativa");
  });
});

import { describe, expect, it } from "vitest";
import {
  DomainInvariantError,
  assertCanAddComponent,
  buildDependencyClosure,
  getImpactedItems
} from "@/modules/engineering/domain/composition";

describe("composition domain invariants", () => {
  it("builds a transitive closure for impact analysis", () => {
    const closure = buildDependencyClosure([
      { parentItemId: "prato", childItemId: "molho" },
      { parentItemId: "molho", childItemId: "tomate" },
      { parentItemId: "prato", childItemId: "embalagem" }
    ]);

    expect(closure).toEqual(
      expect.arrayContaining([
        {
          itemAscendenteId: "prato",
          itemDescendenteId: "prato",
          profundidade: 0,
          relacaoDireta: false
        },
        {
          itemAscendenteId: "prato",
          itemDescendenteId: "molho",
          profundidade: 1,
          relacaoDireta: true
        },
        {
          itemAscendenteId: "prato",
          itemDescendenteId: "tomate",
          profundidade: 2,
          relacaoDireta: false
        }
      ])
    );
  });

  it("rejects cyclic composition graphs", () => {
    expect(() =>
      buildDependencyClosure([
        { parentItemId: "prato", childItemId: "molho" },
        { parentItemId: "molho", childItemId: "prato" }
      ])
    ).toThrow(DomainInvariantError);
  });

  it("blocks linking a component that would close a cycle", () => {
    const closure = buildDependencyClosure([
      { parentItemId: "prato", childItemId: "molho" },
      { parentItemId: "molho", childItemId: "tempero" }
    ]);

    expect(() =>
      assertCanAddComponent({
        itemResultanteId: "tempero",
        itemComponenteId: "prato",
        closure
      })
    ).toThrow("geraria ciclo");
  });

  it("lists impacted ascendants from the closure table", () => {
    const closure = buildDependencyClosure([
      { parentItemId: "combo", childItemId: "prato" },
      { parentItemId: "prato", childItemId: "molho" },
      { parentItemId: "molho", childItemId: "tomate" }
    ]);

    expect(getImpactedItems("tomate", closure)).toEqual([
      { itemId: "molho", profundidade: 1 },
      { itemId: "prato", profundidade: 2 },
      { itemId: "combo", profundidade: 3 }
    ]);
  });
});

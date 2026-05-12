import { describe, expect, it } from "vitest";
import { assertActorPermission } from "@/modules/access/server/authorization";

describe("authorization guards", () => {
  it("allows engenharia to write ficha", () => {
    expect(() =>
      assertActorPermission(
        {
          userId: "user-engenharia",
          restaurantId: "rest_padrao",
          roleCodes: ["engenharia"]
        },
        "ficha.write"
      )
    ).not.toThrow();
  });

  it("blocks consulta from import and write actions", () => {
    expect(() =>
      assertActorPermission(
        {
          userId: "user-consulta",
          restaurantId: "rest_padrao",
          roleCodes: ["consulta"]
        },
        "import.run"
      )
    ).toThrow("Acesso negado");
  });
});

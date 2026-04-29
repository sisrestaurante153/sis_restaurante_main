import { describe, expect, it } from "vitest";
import {
  assertPermission,
  canAccessRoute,
  getPermissionsForRoles,
  getRoutePolicy
} from "@/modules/access/domain/access-control";

describe("access control policy", () => {
  it("grants read-only permissions to consulta", () => {
    expect(getPermissionsForRoles(["consulta"])).toEqual(
      expect.arrayContaining(["item.read", "ficha.read", "impact.read"])
    );
    expect(getPermissionsForRoles(["consulta"])).not.toContain("item.write");
  });

  it("rejects write permission for consulta", () => {
    expect(() => assertPermission(["consulta"], "item.write")).toThrow("Acesso negado");
  });

  it("allows consulta on read routes and blocks write routes", () => {
    expect(canAccessRoute("/itens", ["consulta"])).toBe(true);
    expect(canAccessRoute("/custos", ["consulta"])).toBe(true);
    expect(canAccessRoute("/itens/novo", ["consulta"])).toBe(false);
    expect(canAccessRoute("/fichas/nova", ["consulta"])).toBe(false);
  });

  it("maps import route to import permission", () => {
    expect(getRoutePolicy("/importacao")?.permission).toBe("import.run");
    expect(getRoutePolicy("/importacao/pendencias")?.permission).toBe("import.run");
  });
});

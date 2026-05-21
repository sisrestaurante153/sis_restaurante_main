import { describe, expect, it } from "vitest";
import {
  canAccessRoute,
  getPermissionsForRoles,
  hasPermission,
  assertPermission,
  isPublicPath,
  isProtectedPath,
  resolveEffectivePermissions
} from "@/modules/access/domain/access-control";

describe("getPermissionsForRoles", () => {
  it("admin tem todas as permissões", () => {
    const perms = getPermissionsForRoles(["admin"]);
    expect(perms).toContain("billing.manage");
    expect(perms).toContain("import.run");
    expect(perms).toContain("item.write");
    expect(perms).toContain("ficha.write");
  });

  it("engenharia não tem billing.manage nem import.run", () => {
    const perms = getPermissionsForRoles(["engenharia"]);
    expect(perms).not.toContain("billing.manage");
    expect(perms).not.toContain("import.run");
  });

  it("consulta só tem leitura", () => {
    const perms = getPermissionsForRoles(["consulta"]);
    expect(perms).toContain("item.read");
    expect(perms).toContain("ficha.read");
    expect(perms).toContain("impact.read");
    expect(perms).not.toContain("item.write");
    expect(perms).not.toContain("ficha.write");
  });

  it("role desconhecida retorna sem permissões extras", () => {
    const perms = getPermissionsForRoles(["desconhecido"]);
    expect(perms).toHaveLength(0);
  });

  it("combinação de roles acumula permissões sem duplicatas", () => {
    const perms = getPermissionsForRoles(["consulta", "engenharia"]);
    const unique = new Set(perms);
    expect(unique.size).toBe(perms.length);
    expect(perms).toContain("item.write");
    expect(perms).toContain("item.read");
  });
});

describe("hasPermission", () => {
  it("admin tem qualquer permissão", () => {
    expect(hasPermission(["admin"], "billing.manage")).toBe(true);
    expect(hasPermission(["admin"], "import.run")).toBe(true);
  });

  it("consulta não tem item.write", () => {
    expect(hasPermission(["consulta"], "item.write")).toBe(false);
  });

  it("lista vazia não tem nenhuma permissão", () => {
    expect(hasPermission([], "item.read")).toBe(false);
  });
});

describe("assertPermission", () => {
  it("não lança para permissão válida", () => {
    expect(() => assertPermission(["admin"], "billing.manage")).not.toThrow();
  });

  it("lança para permissão negada", () => {
    expect(() => assertPermission(["consulta"], "billing.manage")).toThrow(/billing.manage/);
  });
});

describe("canAccessRoute", () => {
  it("admin acessa todas as rotas protegidas", () => {
    expect(canAccessRoute("/itens", ["admin"])).toBe(true);
    expect(canAccessRoute("/billing", ["admin"])).toBe(true);
    expect(canAccessRoute("/importacao", ["admin"])).toBe(true);
    expect(canAccessRoute("/fichas", ["admin"])).toBe(true);
  });

  it("consulta não acessa rota de escrita", () => {
    expect(canAccessRoute("/itens/novo", ["consulta"])).toBe(false);
    expect(canAccessRoute("/fichas/nova", ["consulta"])).toBe(false);
  });

  it("consulta acessa rotas de leitura", () => {
    expect(canAccessRoute("/itens", ["consulta"])).toBe(true);
    expect(canAccessRoute("/fichas", ["consulta"])).toBe(true);
    expect(canAccessRoute("/dashboard", ["consulta"])).toBe(true);
  });

  it("engenharia não acessa billing", () => {
    expect(canAccessRoute("/billing", ["engenharia"])).toBe(false);
  });

  it("rota sem política permite acesso a qualquer role", () => {
    expect(canAccessRoute("/rota-inexistente", [])).toBe(true);
  });
});

describe("isPublicPath", () => {
  it("/ é público", () => expect(isPublicPath("/")).toBe(true));
  it("/login é público", () => expect(isPublicPath("/login")).toBe(true));
  it("/registro é público", () => expect(isPublicPath("/registro")).toBe(true));
  it("/forbidden é público", () => expect(isPublicPath("/forbidden")).toBe(true));
  it("/dashboard não é público", () => expect(isPublicPath("/dashboard")).toBe(false));
  it("/api/health é público", () => expect(isPublicPath("/api/health")).toBe(true));
});

describe("isProtectedPath", () => {
  it("/itens é protegida", () => expect(isProtectedPath("/itens")).toBe(true));
  it("/billing é protegida", () => expect(isProtectedPath("/billing")).toBe(true));
  it("/rota-qualquer não é protegida", () => expect(isProtectedPath("/rota-qualquer")).toBe(false));
});

describe("resolveEffectivePermissions", () => {
  it("merge de permissões de role + assignments explícitos sem duplicatas", () => {
    const perms = resolveEffectivePermissions(["consulta"], [
      { roleCode: "consulta", permissionCode: "item.write" }
    ]);
    expect(perms).toContain("item.write");
    expect(perms).toContain("item.read");
    const unique = new Set(perms);
    expect(unique.size).toBe(perms.length);
  });
});

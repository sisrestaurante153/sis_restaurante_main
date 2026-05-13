export type RoleCode = "admin" | "engenharia" | "consulta";

export type PermissionCode =
  | "item.read"
  | "item.write"
  | "ficha.read"
  | "ficha.write"
  | "impact.read"
  | "import.run"
  | "cost.recalculate"
  | "billing.manage";

export interface RoutePolicy {
  pattern: RegExp;
  permission: PermissionCode;
}

const rolePermissions: Record<RoleCode, PermissionCode[]> = {
  admin: [
    "item.read",
    "item.write",
    "ficha.read",
    "ficha.write",
    "impact.read",
    "import.run",
    "cost.recalculate",
    "billing.manage"
  ],
  engenharia: [
    "item.read",
    "item.write",
    "ficha.read",
    "ficha.write",
    "impact.read",
    "cost.recalculate"
  ],
  consulta: ["item.read", "ficha.read", "impact.read"]
};

const protectedRoutePolicies: RoutePolicy[] = [
  { pattern: /^\/itens\/novo$/, permission: "item.write" },
  { pattern: /^\/itens\/[^/]+$/, permission: "item.write" },
  { pattern: /^\/itens$/, permission: "item.read" },
  { pattern: /^\/cadastros$/, permission: "item.write" },
  { pattern: /^\/fichas\/nova$/, permission: "ficha.write" },
  { pattern: /^\/fichas\/[^/]+$/, permission: "ficha.write" },
  { pattern: /^\/fichas$/, permission: "ficha.read" },
  { pattern: /^\/dashboard$/, permission: "item.read" },
  { pattern: /^\/montagem$/, permission: "ficha.read" },
  { pattern: /^\/composicao$/, permission: "impact.read" },
  { pattern: /^\/custos$/, permission: "impact.read" },
  { pattern: /^\/importacao$/, permission: "import.run" },
  { pattern: /^\/importacao\/pendencias$/, permission: "import.run" },
  { pattern: /^\/auditoria$/, permission: "item.read" },
  { pattern: /^\/billing$/, permission: "billing.manage" },
  { pattern: /^\/billing\/.*$/, permission: "billing.manage" }
];

const publicPaths = ["/", "/login", "/registro", "/bem-vindo", "/forbidden", "/api/health"];

export function getPermissionsForRoles(roleCodes: readonly string[]) {
  const permissions = roleCodes.flatMap((roleCode) =>
    rolePermissions[roleCode as RoleCode] ? rolePermissions[roleCode as RoleCode] : []
  );

  return [...new Set(permissions)].sort();
}

export function hasPermission(roleCodes: readonly string[], permission: PermissionCode) {
  return getPermissionsForRoles(roleCodes).includes(permission);
}

export function assertPermission(roleCodes: readonly string[], permission: PermissionCode) {
  if (!hasPermission(roleCodes, permission)) {
    throw new Error(`Acesso negado: permissao ${permission} obrigatoria.`);
  }
}

export function getRoutePolicy(pathname: string) {
  return protectedRoutePolicies.find((policy) => policy.pattern.test(pathname)) ?? null;
}

export function canAccessRoute(pathname: string, roleCodes: readonly string[]) {
  const policy = getRoutePolicy(pathname);

  if (!policy) {
    return true;
  }

  return hasPermission(roleCodes, policy.permission);
}

export function isPublicPath(pathname: string) {
  return publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function isProtectedPath(pathname: string) {
  return Boolean(getRoutePolicy(pathname));
}

export function resolveEffectivePermissions(
  roleCodes: readonly string[],
  assignments: ReadonlyArray<{ roleCode: string; permissionCode: string }>
) {
  const explicitPermissions = assignments
    .filter((assignment) => roleCodes.includes(assignment.roleCode))
    .map((assignment) => assignment.permissionCode as PermissionCode);

  return [...new Set([...getPermissionsForRoles(roleCodes), ...explicitPermissions])].sort();
}

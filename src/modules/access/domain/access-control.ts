export type RoleCode = "super-admin" | "admin" | "engenharia" | "consulta";

export type PermissionCode =
  | "item.read"
  | "item.write"
  | "ficha.read"
  | "ficha.write"
  | "impact.read"
  | "import.read"
  | "import.run"
  | "cost.recalculate"
  | "menu.read"
  | "menu.write"
  | "sales.read"
  | "sales.write"
  | "billing.manage"
  | "platform.manage";

export interface RoutePolicy {
  pattern: RegExp;
  permission: PermissionCode;
}

const rolePermissions: Record<RoleCode, PermissionCode[]> = {
  "super-admin": [
    "item.read",
    "item.write",
    "ficha.read",
    "ficha.write",
    "impact.read",
    "import.read",
    "import.run",
    "cost.recalculate",
    "menu.read",
    "menu.write",
    "sales.read",
    "sales.write",
    "billing.manage",
    "platform.manage"
  ],
  admin: [
    "item.read",
    "item.write",
    "ficha.read",
    "ficha.write",
    "impact.read",
    "import.read",
    "import.run",
    "cost.recalculate",
    "menu.read",
    "menu.write",
    "sales.read",
    "sales.write",
    "billing.manage"
  ],
  engenharia: [
    "item.read",
    "item.write",
    "ficha.read",
    "ficha.write",
    "impact.read",
    "import.read",
    "import.run",
    "cost.recalculate",
    "menu.read",
    "menu.write",
    "sales.read",
    "sales.write"
  ],
  consulta: [
    "item.read",
    "ficha.read",
    "impact.read",
    "import.read",
    "menu.read",
    "sales.read"
  ]
};

const protectedRoutePolicies: RoutePolicy[] = [
  { pattern: /^\/itens\/novo$/, permission: "item.write" },
  { pattern: /^\/itens\/[^/]+$/, permission: "item.read" },
  { pattern: /^\/itens$/, permission: "item.read" },
  { pattern: /^\/cadastros$/, permission: "item.read" },
  { pattern: /^\/cadastros\/.*$/, permission: "item.read" },
  { pattern: /^\/fichas\/nova$/, permission: "ficha.write" },
  { pattern: /^\/fichas\/[^/]+$/, permission: "ficha.read" },
  { pattern: /^\/fichas$/, permission: "ficha.read" },
  { pattern: /^\/dashboard$/, permission: "item.read" },
  { pattern: /^\/montagem$/, permission: "ficha.read" },
  { pattern: /^\/composicao$/, permission: "impact.read" },
  { pattern: /^\/custos$/, permission: "impact.read" },
  { pattern: /^\/importacao$/, permission: "import.read" },
  { pattern: /^\/importacao\/itens$/, permission: "import.run" },
  { pattern: /^\/importacao\/pendencias$/, permission: "import.read" },
  { pattern: /^\/pre-preparo$/, permission: "item.read" },
  { pattern: /^\/cardapios\/novo$/, permission: "menu.write" },
  { pattern: /^\/cardapios\/[^/]+$/, permission: "menu.read" },
  { pattern: /^\/cardapios$/, permission: "menu.read" },
  { pattern: /^\/vendas\/nova$/, permission: "sales.write" },
  { pattern: /^\/vendas$/, permission: "sales.read" },
  { pattern: /^\/retorno-financeiro$/, permission: "sales.read" },
  { pattern: /^\/historico$/, permission: "ficha.read" },
  { pattern: /^\/auditoria$/, permission: "platform.manage" },
  { pattern: /^\/billing$/, permission: "platform.manage" },
  { pattern: /^\/billing\/.*$/, permission: "platform.manage" },
  { pattern: /^\/usuarios$/, permission: "billing.manage" },
  { pattern: /^\/planos$/, permission: "billing.manage" },
  { pattern: /^\/assinatura$/, permission: "billing.manage" },
  { pattern: /^\/assinaturas$/, permission: "billing.manage" },
  { pattern: /^\/restaurantes$/, permission: "platform.manage" },
  { pattern: /^\/admin$/, permission: "platform.manage" },
  { pattern: /^\/admin\/.*$/, permission: "platform.manage" }
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

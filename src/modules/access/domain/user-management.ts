export function normalizeUserEmail(email: string) {
  return email.trim().toLowerCase();
}

export function parseRoleCodes(input: string | string[]) {
  const rawValues = Array.isArray(input) ? input : [input];
  const seen = new Set<string>();
  const roleCodes: string[] = [];

  for (const rawValue of rawValues) {
    for (const entry of rawValue.split(",")) {
      const normalized = entry.trim().toLowerCase();

      if (!normalized || seen.has(normalized)) {
        continue;
      }

      seen.add(normalized);
      roleCodes.push(normalized);
    }
  }

  if (roleCodes.length === 0) {
    throw new Error("Informe pelo menos um role.");
  }

  return roleCodes;
}

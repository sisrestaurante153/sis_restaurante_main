const ABSOLUTE_URL_PATTERN = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;

export function normalizeBasePath(basePath?: string | null) {
  const value = basePath?.trim() ?? "";

  if (!value || value === "/") {
    return "";
  }

  return `/${value.replace(/^\/+|\/+$/g, "")}`;
}

export function resolveBasePath(input: {
  explicitBasePath?: string | null;
  appUrl?: string | null;
} = {}) {
  const explicitBasePath = normalizeBasePath(input.explicitBasePath);

  if (explicitBasePath) {
    return explicitBasePath;
  }

  const appUrl = input.appUrl?.trim();

  if (!appUrl) {
    return "";
  }

  try {
    return normalizeBasePath(new URL(appUrl).pathname);
  } catch {
    return "";
  }
}

export function withBasePath(path: string, basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "") {
  if (!path || ABSOLUTE_URL_PATTERN.test(path) || path.startsWith("#")) {
    return path;
  }

  const normalizedBasePath = normalizeBasePath(basePath);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (!normalizedBasePath) {
    return normalizedPath;
  }

  if (normalizedPath === normalizedBasePath || normalizedPath.startsWith(`${normalizedBasePath}/`)) {
    return normalizedPath;
  }

  return `${normalizedBasePath}${normalizedPath}`;
}

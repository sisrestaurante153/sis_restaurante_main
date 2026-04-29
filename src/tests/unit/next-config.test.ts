import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveBasePath, withBasePath } from "@/modules/platform/lib/base-path";
import nextConfig from "../../../next.config";

describe("nextConfig", () => {
  it("allows legacy workbook uploads larger than the default server action body limit", () => {
    expect(nextConfig.experimental?.serverActions).toEqual(
      expect.objectContaining({
        bodySizeLimit: "64mb"
      })
    );
  });

  it("documents a production nginx upload limit aligned with the app upload limit", () => {
    const envExample = readFileSync(
      path.resolve(process.cwd(), ".env.production.example"),
      "utf8"
    );

    expect(envExample).toContain("NGINX_CLIENT_MAX_BODY_SIZE=64m");
  });

  it("derives the base path from the public app URL", () => {
    expect(resolveBasePath({ appUrl: "https://felipeb.tech/sisfichas" })).toBe("/sisfichas");
    expect(resolveBasePath({ appUrl: "https://felipeb.tech" })).toBe("");
  });

  it("prefixes internal paths without duplicating the base path", () => {
    expect(withBasePath("/api/health", "/sisfichas")).toBe("/sisfichas/api/health");
    expect(withBasePath("/sisfichas/api/health", "/sisfichas")).toBe("/sisfichas/api/health");
  });
});

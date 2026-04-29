import type { NextConfig } from "next";
import { resolveBasePath } from "./src/modules/platform/lib/base-path";

const basePath = resolveBasePath({
  explicitBasePath: process.env.NEXT_PUBLIC_BASE_PATH,
  appUrl: process.env.APP_URL
});

const nextConfig: NextConfig = {
  output: "standalone",
  basePath: basePath || undefined,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath
  },
  experimental: {
    typedRoutes: true,
    serverActions: {
      bodySizeLimit: "64mb"
    }
  }
};

export default nextConfig;

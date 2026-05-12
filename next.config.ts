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
  transpilePackages: [
    "@mui/material",
    "@mui/system",
    "@mui/icons-material",
    "@mui/lab",
    "@mui/x-data-grid",
    "@mui/x-date-pickers",
    "@mui/utils",
    "@mui/private-theming"
  ],
  experimental: {
    typedRoutes: true,
    serverActions: {
      bodySizeLimit: "64mb"
    }
  }
};

export default nextConfig;

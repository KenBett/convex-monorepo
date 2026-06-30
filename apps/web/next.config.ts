import type { NextConfig } from "next";

import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.join(projectRoot, "../..");

const nextConfig: NextConfig = {
  transpilePackages: ["@repo/types", "@repo/utils"],
  outputFileTracingRoot: monorepoRoot,
  turbopack: {
    root: monorepoRoot,
    resolveAlias: {
      convex: path.join(monorepoRoot, "node_modules/convex"),
    },
  },
};

export default nextConfig;

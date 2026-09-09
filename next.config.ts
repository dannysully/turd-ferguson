import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* The scan adapter reads fixtures/*.json at runtime via a dynamic path, which
     file tracing cannot follow. Include them in every function bundle. */
  outputFileTracingIncludes: {
    "/**": ["./fixtures/**/*"],
  },
  /* config options here */
};

export default nextConfig;

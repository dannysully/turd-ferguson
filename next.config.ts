import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* The scan adapter reads fixtures/*.json at runtime via a dynamic path, which
     file tracing cannot follow. Include them in every function bundle. */
  outputFileTracingIncludes: {
    "/**": ["./fixtures/**/*"],
  },
  /**
   * /example is gone - Danny, 19 Sep 2026: "We no longer need example you can
   * remove this." It was live for weeks and may be linked from somewhere
   * neither of us can see, so it redirects rather than 404s.
   */
  async redirects() {
    return [
      {
        source: "/example",
        destination: "/",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

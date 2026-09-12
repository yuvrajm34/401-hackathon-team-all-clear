import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // unpdf and mammoth expect Node; keep them out of the client bundle.
  serverExternalPackages: ["unpdf", "mammoth"],
};

export default nextConfig;

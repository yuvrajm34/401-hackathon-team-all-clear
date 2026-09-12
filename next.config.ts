import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["172.20.10.3"],
  // unpdf and mammoth expect Node; keep them out of the client bundle.
  serverExternalPackages: ["unpdf", "mammoth"],
};

export default nextConfig;

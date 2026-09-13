import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Whole last octet wildcarded so a DHCP lease change on the same network
  // doesn't silently break phone access again — see allowedDevOrigins docs
  // in node_modules/next/dist/docs. Needs updating to match whatever subnet
  // you're actually on if you switch networks (dorm Wi-Fi, hotspot, etc.).
  allowedDevOrigins: ["10.0.0.*"],
  // unpdf and mammoth expect Node; keep them out of the client bundle.
  serverExternalPackages: ["unpdf", "mammoth"],
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Whole last octet wildcarded so a DHCP lease change on the same network
  // doesn't silently break phone access again — see allowedDevOrigins docs
  // in node_modules/next/dist/docs. Needs updating to match whatever subnet
  // you're actually on if you switch networks (dorm Wi-Fi, hotspot, etc.).
  // `*.trycloudflare.com` covers cloudflared's quick tunnels — each run
  // gets a random subdomain, so a wildcard is the only way to allow it
  // without editing this file every time the tunnel restarts.
  allowedDevOrigins: ["172.20.10.*", "*.trycloudflare.com"],
  // unpdf and mammoth expect Node; keep them out of the client bundle.
  serverExternalPackages: ["unpdf", "mammoth"],
  devIndicators: false,
};

export default nextConfig;

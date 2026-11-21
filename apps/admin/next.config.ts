import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O pacote de UI é distribuído como código-fonte e compilado junto com o app.
  transpilePackages: ["@super-pdv/ui", "@super-pdv/web-session"],
};

export default nextConfig;

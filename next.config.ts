import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf.js loads its worker by file path, so it has to stay outside the server bundle.
  serverExternalPackages: ["pdfjs-dist"],
  experimental: {
    // Weekly bulletin PDFs are 1-2 MB. Vercel caps request bodies at 4.5 MB.
    serverActions: { bodySizeLimit: "4.5mb" },
  },
};

export default nextConfig;

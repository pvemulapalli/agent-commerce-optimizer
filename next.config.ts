import type { NextConfig } from "next";

const HOMEPAGE_LINK_HEADER =
  '</sitemap.xml>; rel="sitemap", </api-docs>; rel="service-doc", </.well-known/api-catalog>; rel="api-catalog"';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/",
        headers: [
          {
            key: "Link",
            value: HOMEPAGE_LINK_HEADER,
          },
        ],
      },
    ];
  },
};

export default nextConfig;

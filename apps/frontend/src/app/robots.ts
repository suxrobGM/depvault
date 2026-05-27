import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/overview/", "/projects/", "/settings/", "/profile/"],
      },
    ],
    sitemap: "https://depvault.com/sitemap.xml",
  };
}

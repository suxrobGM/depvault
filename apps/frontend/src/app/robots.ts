import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard/", "/projects/", "/settings/", "/profile/"],
      },
    ],
    sitemap: "https://depvault.com/sitemap.xml",
  };
}

import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/sign-in",
          "/sign-up",
          "/dashboard",
          "/customers",
          "/jobs",
          "/inventory",
          "/reports",
          "/branches",
          "/team",
          "/field",
          "/portal",
        ],
      },
    ],
    ...(SITE_URL ? { sitemap: `${SITE_URL}/sitemap.xml` } : {}),
  };
}

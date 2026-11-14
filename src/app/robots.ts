import type { MetadataRoute } from "next";
import { site } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/painel", "/organizador", "/admin", "/onboarding", "/auth", "/redefinir-senha"] },
    sitemap: `${site.url}/sitemap.xml`,
  };
}

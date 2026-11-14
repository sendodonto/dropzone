import type { MetadataRoute } from "next";
import { site } from "@/config/site";
import { listTournaments } from "@/lib/queries";

// Public pages + every public, non-draft tournament. Account areas stay out (see robots.ts).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = ["", "/campeonatos", "/apostados", "/rankings", "/equipes", "/como-funciona", "/planos", "/termos", "/privacidade"];
  const tournaments = await listTournaments({ limit: 500 }).catch(() => []);
  return [
    ...pages.map((p) => ({ url: `${site.url}${p}`, changeFrequency: "daily" as const, priority: p ? 0.7 : 1 })),
    ...tournaments.map((t) => ({ url: `${site.url}/campeonatos/${t.slug}`, changeFrequency: "hourly" as const, priority: 0.8 })),
  ];
}

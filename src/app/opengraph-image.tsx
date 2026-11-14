import { ImageResponse } from "next/og";
import { site } from "@/config/site";

// Link preview for WhatsApp, Discord, X, etc. Same blue field as the home hero.
export const alt = `${site.name} — Campeonatos de ${site.game}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#1f5ed9", color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 44, fontWeight: 800, letterSpacing: -1 }}>
          <svg width="56" height="56" viewBox="0 0 24 24">
            <path d="M12 2 4 7v6c0 4.4 3.4 8.1 8 9 4.6-.9 8-4.6 8-9V7l-8-5Z" fill="#ffffff" fillOpacity="0.22" stroke="#ffffff" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M12 7v7m0 0-3-3m3 3 3-3" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>{site.name}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 84, fontWeight: 800, lineHeight: 1, letterSpacing: -3, maxWidth: 900 }}>{site.tagline}</div>
          <div style={{ fontSize: 32, opacity: 0.85 }}>{`Campeonatos de ${site.game}: inscrição, sala, tabela e ranking.`}</div>
        </div>
      </div>
    ),
    size,
  );
}

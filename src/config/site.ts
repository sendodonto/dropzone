// Brand configuration. Rename the product, change copy or links here only.
// Colors live as CSS tokens in src/app/globals.css (--primary is the accent).
export const site = {
  name: "DROPZONE",
  shortName: "DZ",
  tagline: "Seu próximo campeonato começa aqui.",
  description: "Encontre torneios, monte seu squad e dispute seu lugar entre os melhores.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  game: "Free Fire",
  locale: "pt-BR",
  timezone: "America/Sao_Paulo",
  support: { email: "contato@exemplo.com", discord: null as string | null, instagram: null as string | null },
  disclaimer:
    "Plataforma independente, sem vínculo com a Garena. Free Fire é marca registrada de seus respectivos donos.",
} as const;

export const regions = [
  { value: "BR", label: "Brasil" },
  { value: "LATAM", label: "América Latina" },
  { value: "NA", label: "América do Norte" },
] as const;

export const maps = ["Bermuda", "Purgatório", "Kalahari", "Alpine", "Nova Terra", "Solara"] as const;

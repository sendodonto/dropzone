import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { site } from "@/config/site";
import { getOrganizingOpen } from "@/lib/auth";

const cols = [
  { title: "Plataforma", links: [["Campeonatos", "/campeonatos"], ["Apostados", "/apostados"], ["Rankings", "/rankings"], ["Equipes", "/equipes"], ["Como funciona", "/como-funciona"]] },
  { title: "Organizadores", links: [["Organizar campeonato", "/organizador/comecar"], ["Planos", "/planos"], ["Painel do organizador", "/organizador"]] },
  { title: "Legal", links: [["Termos de uso", "/termos"], ["Privacidade", "/privacidade"], ["Regras da comunidade", "/termos#conduta"]] },
] as const;

export async function SiteFooter() {
  const open = await getOrganizingOpen();
  const shown = open ? cols : cols.filter((c) => c.title !== "Organizadores");
  return (
    <footer className="on-color mt-auto bg-[oklch(0.12_0_0)]">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="col-span-2 grid content-start gap-3 lg:col-span-1">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">{site.description}</p>
        </div>
        {shown.map((c) => (
          <div key={c.title}>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{c.title}</h2>
            <ul className="mt-3 grid gap-3 text-sm lg:gap-2">
              {c.links.map(([label, href]) => (
                <li key={href}><Link href={href} className="text-white/80 hover:text-white hover:underline">{label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} {site.name}. Todos os direitos reservados.</p>
          <p>{site.disclaimer}</p>
        </div>
      </div>
    </footer>
  );
}

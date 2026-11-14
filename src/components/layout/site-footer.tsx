import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { site } from "@/config/site";

const cols = [
  { title: "Plataforma", links: [["Campeonatos", "/campeonatos"], ["Rankings", "/rankings"], ["Equipes", "/equipes"], ["Como funciona", "/como-funciona"]] },
  { title: "Organizadores", links: [["Organizar campeonato", "/organizador/comecar"], ["Planos", "/planos"], ["Painel do organizador", "/organizador"]] },
  { title: "Conta", links: [["Entrar", "/entrar"], ["Criar conta", "/cadastro"], ["Meu painel", "/painel"]] },
  { title: "Legal", links: [["Termos de uso", "/termos"], ["Privacidade", "/privacidade"], ["Regras da comunidade", "/termos#conduta"]] },
] as const;

export function SiteFooter() {
  return (
    <footer className="on-color mt-auto bg-[oklch(0.12_0_0)]">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div className="grid content-start gap-3">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">{site.description}</p>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{c.title}</h2>
            <ul className="mt-3 grid gap-2 text-sm">
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

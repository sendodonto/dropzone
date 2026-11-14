"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  ["/admin", "Dashboard"], ["/admin/usuarios", "Usuários"], ["/admin/organizadores", "Organizadores"],
  ["/admin/campeonatos", "Campeonatos"], ["/admin/equipes", "Equipes"], ["/admin/denuncias", "Denúncias"],
  ["/admin/temporadas", "Temporadas"], ["/admin/planos", "Planos"], ["/admin/pagamentos", "Pagamentos"],
  ["/admin/configuracoes", "Configurações"], ["/admin/logs", "Logs"],
] as const;

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="scrollbar-none scroll-fade -mx-4 flex gap-1 overflow-x-auto border-b px-4 sm:mx-0 sm:px-0" aria-label="Administração">
      {items.map(([href, label]) => {
        const on = href === "/admin" ? pathname === href : pathname.startsWith(href);
        return (
          <Link key={href} href={href} aria-current={on ? "page" : undefined}
            className={cn("-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm", on ? "border-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground")}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

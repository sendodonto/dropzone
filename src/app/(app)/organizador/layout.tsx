import { MobileSubNav } from "@/components/layout/app-nav";
import { getViewer } from "@/lib/auth";

export default async function OrganizerLayout({ children }: LayoutProps<"/organizador">) {
  const viewer = await getViewer();
  return (
    <>
      {!!viewer?.organizers.length && (
        <MobileSubNav group={{ title: "Organizador", items: [
          { href: "/organizador", label: "Visão geral", icon: "gauge", exact: true },
          { href: "/organizador/campeonatos", label: "Campeonatos", icon: "list" },
          ...(viewer.canOrganize ? [{ href: "/organizador/novo", label: "Criar", icon: "plus" } as const] : []),
          { href: "/organizador/denuncias", label: "Ocorrências", icon: "alert" },
          { href: "/organizador/perfil", label: "Perfil e plano", icon: "org" },
        ] }} />
      )}
      {children}
    </>
  );
}

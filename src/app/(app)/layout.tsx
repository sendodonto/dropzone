import { SiteHeader } from "@/components/layout/site-header";
import { AppSidebar, BottomNav, type NavGroup } from "@/components/layout/app-nav";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Shell for every authenticated area (player, organizer, admin).
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const [{ count: unread }, { count: invites }] = await Promise.all([
    supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
    supabase.from("team_invites").select("id", { count: "exact", head: true }).eq("invited_user_id", viewer.id).eq("status", "pending"),
  ]);

  const groups: NavGroup[] = [
    {
      title: "Jogador",
      items: [
        { href: "/painel", label: "Painel", icon: "dashboard", exact: true },
        { href: "/painel/campeonatos", label: "Meus campeonatos", icon: "trophy" },
        { href: "/painel/squads", label: "Squads", icon: "squads", badge: invites ?? 0 },
        { href: "/painel/notificacoes", label: "Notificações", icon: "bell", badge: unread ?? 0 },
        { href: "/painel/perfil", label: "Perfil", icon: "user" },
      ],
    },
    {
      title: "Organizador",
      items: viewer.organizers.length
        ? [
            { href: "/organizador", label: "Visão geral", icon: "gauge", exact: true },
            { href: "/organizador/campeonatos", label: "Campeonatos", icon: "list" },
            { href: "/organizador/novo", label: "Criar campeonato", icon: "plus" },
            { href: "/organizador/denuncias", label: "Ocorrências", icon: "alert" },
            { href: "/organizador/perfil", label: "Perfil e plano", icon: "org" },
          ]
        : [{ href: "/organizador/comecar", label: "Tornar-se organizador", icon: "org" }],
    },
  ];
  if (viewer.isAdmin)
    groups.push({ title: "Administração", items: [{ href: "/admin", label: "Painel admin", icon: "shield" }] });

  return (
    <>
      <SiteHeader />
      <div className="mx-auto flex w-full max-w-7xl flex-1">
        <AppSidebar groups={groups} />
        <main id="conteudo" className="min-w-0 flex-1 px-4 pt-6 pb-28 sm:px-6 lg:pb-12">{children}</main>
      </div>
      <BottomNav items={[
        { href: "/painel", label: "Painel", icon: "dashboard", exact: true },
        { href: "/campeonatos", label: "Torneios", icon: "trophy" },
        { href: "/painel/squads", label: "Squads", icon: "squads", badge: invites ?? 0 },
        { href: "/painel/notificacoes", label: "Avisos", icon: "bell", badge: unread ?? 0 },
        viewer.organizers.length
          ? { href: "/organizador", label: "Organizar", icon: "org" }
          : { href: "/painel/perfil", label: "Perfil", icon: "user" },
      ]} />
    </>
  );
}

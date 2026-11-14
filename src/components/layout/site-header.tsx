import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { NavLinks, MobileNav, UserMenu, NotificationBell } from "@/components/layout/header-client";

export const publicNav = [
  { href: "/", label: "Início" },
  { href: "/campeonatos", label: "Campeonatos" },
  { href: "/apostados", label: "Apostados" },
  { href: "/rankings", label: "Rankings" },
  { href: "/equipes", label: "Equipes" },
  { href: "/como-funciona", label: "Como funciona" },
];

export async function SiteHeader() {
  const viewer = await getViewer();
  const supabase = await createClient();
  const { data: banner } = await supabase.from("platform_settings").select("value").eq("key", "announcement_banner").maybeSingle();
  let unread = 0;
  if (viewer) {
    const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
    unread = count ?? 0;
  }
  const menuUser = viewer && {
    name: viewer.profile.display_name ?? viewer.profile.username ?? "Jogador",
    username: viewer.profile.username,
    avatar: viewer.profile.avatar_url,
    isAdmin: viewer.isAdmin,
    isOrganizer: viewer.organizers.length > 0,
    canOrganize: viewer.canOrganize,
  };

  return (
    <>
    {typeof banner?.value === "string" && banner.value.trim() && (
      <div className="bg-primary px-4 py-1.5 text-center text-xs font-medium text-primary-foreground" role="status">{banner.value}</div>
    )}
    <header className="material-bar sticky top-0 z-40 border-b">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <MobileNav items={publicNav} user={menuUser} />
        <Logo />
        <NavLinks items={publicNav} />
        <div className="ml-auto flex items-center gap-2">
          {menuUser ? (
            <>
              <Link href="/painel" className={buttonVariants({ size: "sm" })}>Meu painel</Link>
              <NotificationBell unread={unread} />
              <UserMenu user={menuUser} />
            </>
          ) : (
            <>
              <Link href="/entrar" className={cn(buttonVariants({ variant: "ghost" }), "hidden sm:inline-flex")}>Entrar</Link>
              <Link href="/cadastro" className={buttonVariants()}>Criar conta</Link>
            </>
          )}
        </div>
      </div>
    </header>
    </>
  );
}

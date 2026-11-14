"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Building2, LayoutDashboard, LogOut, Menu, Shield, User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/brand/logo";
import { signOut } from "@/lib/actions/auth";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string };
export type MenuUser = { name: string; username: string | null; avatar: string | null; isAdmin: boolean; isOrganizer: boolean; canOrganize: boolean } | null;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="hidden items-center gap-1 lg:flex" aria-label="Principal">
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          aria-current={isActive(pathname, i.href) ? "page" : undefined}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground",
            isActive(pathname, i.href) && "text-foreground",
          )}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}

function UserAvatar({ user, className }: { user: NonNullable<MenuUser>; className?: string }) {
  return (
    <span className={cn("grid size-8 place-items-center overflow-hidden rounded-full border bg-secondary text-xs font-bold", className)}>
      {user.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.avatar} alt="" className="size-full object-cover" />
      ) : initials(user.name)}
    </span>
  );
}

export function UserMenu({ user }: { user: NonNullable<MenuUser> }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50" aria-label="Menu da conta">
        <UserAvatar user={user} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {/* Base UI requires a menu label to live inside a group; without it the menu throws on open. */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="grid">
            <span className="truncate font-medium text-foreground">{user.name}</span>
            {user.username && <span className="truncate text-xs font-normal">@{user.username}</span>}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/painel" />}><LayoutDashboard /> Meu painel</DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/painel/squads" />}><Users /> Meus squads</DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/painel/perfil" />}><User /> Perfil</DropdownMenuItem>
        {(user.isOrganizer || user.canOrganize) && (
          <DropdownMenuItem render={<Link href={user.isOrganizer ? "/organizador" : "/organizador/comecar"} />}>
            <Building2 /> {user.isOrganizer ? "Painel do organizador" : "Organizar campeonato"}
          </DropdownMenuItem>
        )}
        {user.isAdmin && <DropdownMenuItem render={<Link href="/admin" />}><Shield /> Administração</DropdownMenuItem>}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()}><LogOut /> Sair</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function NotificationBell({ unread }: { unread: number }) {
  return (
    <Link
      href="/painel/notificacoes"
      className="relative grid size-9 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      aria-label={unread ? `Notificações: ${unread} não lidas` : "Notificações"}
    >
      <Bell className="size-[18px]" />
      {unread > 0 && (
        <span className="absolute top-1 right-1 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold leading-4 text-primary-foreground">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}

export function MobileNav({ items, user }: { items: NavItem[]; user: MenuUser }) {
  const pathname = usePathname();
  return (
    <Sheet>
      <SheetTrigger render={<Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menu" />}>
        <Menu />
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <div className="border-b p-4"><Logo /></div>
        <nav className="grid gap-1 p-3" aria-label="Menu móvel">
          {items.map((i) => (
            <Link key={i.href} href={i.href}
              className={cn("rounded-md px-3 py-2.5 text-sm hover:bg-muted", isActive(pathname, i.href) ? "bg-muted text-foreground" : "text-muted-foreground")}>
              {i.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto grid gap-2 border-t p-3">
          {user ? (
            <>
              <Link href="/painel" className="rounded-md px-3 py-2.5 text-sm hover:bg-muted">Meu painel</Link>
              {(user.isOrganizer || user.canOrganize) && (
                <Link href={user.isOrganizer ? "/organizador" : "/organizador/comecar"} className="rounded-md px-3 py-2.5 text-sm hover:bg-muted">
                  {user.isOrganizer ? "Painel do organizador" : "Organizar campeonato"}
                </Link>
              )}
              {user.isAdmin && <Link href="/admin" className="rounded-md px-3 py-2.5 text-sm hover:bg-muted">Administração</Link>}
            </>
          ) : (
            <>
              <Link href="/entrar" className="rounded-md border px-3 py-2.5 text-center text-sm">Entrar</Link>
              <Link href="/cadastro" className="rounded-md bg-primary px-3 py-2.5 text-center text-sm font-medium text-primary-foreground">Criar conta</Link>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

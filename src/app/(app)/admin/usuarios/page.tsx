import type { Metadata } from "next";
import Link from "next/link";
import { Ban, PauseCircle, PlayCircle, Shield, ShieldOff } from "lucide-react";
import { Avatar, DemoBadge, PageHeader } from "@/components/shared/ui-bits";
import { ActionButton } from "@/components/shared/action-button";
import { SearchBox } from "@/app/(site)/equipes/search-box";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { setUserRole, setUserStatus } from "@/lib/actions/admin";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";

export const metadata: Metadata = { title: "Usuários · Admin" };

export default async function AdminUsers({ searchParams }: PageProps<"/admin/usuarios">) {
  const viewer = await requireAdmin();
  const { q, status } = (await searchParams) as { q?: string; status?: string };
  const supabase = await createClient();
  let query = supabase.from("profiles").select("*, roles:user_roles!user_roles_user_id_fkey(role)").order("created_at", { ascending: false }).limit(100);
  if (q) query = query.or(`username.ilike.%${q.replace(/[%_,()]/g, "")}%,display_name.ilike.%${q.replace(/[%_,()]/g, "")}%`);
  if (status && ["active", "suspended", "banned"].includes(status)) query = query.eq("status", status);
  const { data } = await query;
  const users = (data ?? []) as (Profile & { roles: { role: string }[] })[];
  return (
    <div className="grid gap-4">
      <PageHeader title="Usuários" description="Suspensões e banimentos exigem motivo e ficam registrados." />
      <div className="flex flex-wrap items-center gap-3">
        <SearchBox placeholder="Buscar por username ou nome" defaultValue={q} />
        {["", "active", "suspended", "banned"].map((s) => (
          <Link key={s} href={s ? `?status=${s}` : "?"} className={cn("rounded-md px-2.5 py-1 text-sm", (status ?? "") === s ? "bg-muted text-foreground" : "text-muted-foreground")}>
            {{ "": "Todos", active: "Ativos", suspended: "Suspensos", banned: "Banidos" }[s]}
          </Link>
        ))}
      </div>
      <ul className="divide-y rounded-3xl bg-card">
        {users.map((u) => {
          const admin = u.roles.some((r) => r.role === "admin");
          const self = u.id === viewer.id;
          return (
            <li key={u.id} className="flex flex-wrap items-center gap-3 p-3">
              <Avatar src={u.avatar_url} name={u.display_name} rounded />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
                  {u.username ? <Link href={`/jogadores/${u.username}`} className="hover:text-primary-text">{u.display_name}</Link> : u.display_name}
                  {admin && <span className="rounded bg-primary/15 px-1.5 text-[10px] font-semibold uppercase text-primary-text">admin</span>}
                  {u.is_demo && <DemoBadge />}
                  {u.status !== "active" && <span className="rounded bg-destructive/15 px-1.5 text-[10px] font-semibold uppercase text-destructive">{u.status}</span>}
                </p>
                <p className="text-xs text-muted-foreground">@{u.username ?? "—"} · desde {formatDate(u.created_at)}{u.status_reason && ` · ${u.status_reason}`}</p>
              </div>
              {!self && (
                <div className="flex flex-wrap gap-1">
                  {u.status === "active" ? (
                    <>
                      <ActionButton action={setUserStatus.bind(null, u.id, "suspended")} variant="ghost" size="sm" reason={{ label: "Motivo da suspensão", required: true }} confirm={{ title: `Suspender @${u.username}?` }}><PauseCircle /> Suspender</ActionButton>
                      <ActionButton action={setUserStatus.bind(null, u.id, "banned")} variant="ghost" size="sm" reason={{ label: "Motivo do banimento", required: true }} confirm={{ title: `Banir @${u.username}?`, destructive: true, confirmLabel: "Banir" }}><Ban /> Banir</ActionButton>
                    </>
                  ) : (
                    <ActionButton action={setUserStatus.bind(null, u.id, "active")} variant="outline" size="sm" confirm={{ title: `Reativar @${u.username}?` }}><PlayCircle /> Reativar</ActionButton>
                  )}
                  <ActionButton action={setUserRole.bind(null, u.id, !admin)} variant="ghost" size="sm"
                    confirm={{ title: admin ? "Remover acesso de administrador?" : `Tornar @${u.username} administrador?`, description: "Administradores têm acesso total à plataforma.", destructive: !admin }}>
                    {admin ? <><ShieldOff /> Remover admin</> : <><Shield /> Tornar admin</>}
                  </ActionButton>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

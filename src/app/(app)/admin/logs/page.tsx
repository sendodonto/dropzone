import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/ui-bits";
import { SearchBox } from "@/app/(site)/equipes/search-box";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Logs · Admin" };

export default async function AdminLogs({ searchParams }: PageProps<"/admin/logs">) {
  const { q } = (await searchParams) as { q?: string };
  const supabase = await createClient();
  let query = supabase.from("audit_logs").select("id, action, entity_type, entity_id, data, created_at, actor:profiles(username), tournament:tournaments(name)")
    .order("created_at", { ascending: false }).limit(300);
  if (q) query = query.ilike("action", `%${q.replace(/[%_]/g, "")}%`);
  const { data } = await query;
  type L = { id: number; action: string; entity_type: string; entity_id: string | null; data: unknown; created_at: string; actor: { username: string } | null; tournament: { name: string } | null };
  return (
    <div className="grid gap-4">
      <PageHeader title="Logs administrativos" description="Registro imutável de ações importantes (somente leitura)." />
      <SearchBox placeholder="Filtrar por ação (ex.: user., result., payment.)" defaultValue={q} />
      <div className="overflow-x-auto rounded-3xl bg-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead><tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th scope="col" className="px-3 py-2">Quando</th><th scope="col" className="px-3 py-2">Ação</th><th scope="col" className="px-3 py-2">Autor</th>
            <th scope="col" className="px-3 py-2">Contexto</th><th scope="col" className="px-3 py-2">Dados</th>
          </tr></thead>
          <tbody>
            {((data ?? []) as unknown as L[]).map((l) => (
              <tr key={l.id} className="border-b last:border-0 align-top">
                <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(l.created_at)}</td>
                <td className="px-3 py-2 font-mono text-xs text-primary-text">{l.action}</td>
                <td className="px-3 py-2 text-xs">@{l.actor?.username ?? "sistema"}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{l.tournament?.name ?? l.entity_type}</td>
                <td className="max-w-md truncate px-3 py-2 font-mono text-[11px] text-muted-foreground" title={JSON.stringify(l.data)}>{JSON.stringify(l.data)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

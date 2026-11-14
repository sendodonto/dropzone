"use client";
import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const statusTabs = [
  { value: "", label: "Todos" },
  { value: "open", label: "Inscrições abertas" },
  { value: "live", label: "Em andamento" },
  { value: "upcoming", label: "Próximos" },
  { value: "finished", label: "Encerrados" },
];

const selects: { key: string; label: string; options: [string, string][] }[] = [
  { key: "mode", label: "Modalidade", options: [["", "Todas"], ["squad", "Squad"], ["duo", "Duo"], ["solo", "Solo"]] },
  { key: "price", label: "Inscrição", options: [["", "Todas"], ["free", "Gratuitos"], ["paid", "Pagos"]] },
  { key: "prize", label: "Premiação", options: [["", "Qualquer"], ["with", "Com premiação"], ["100", "R$ 100+"], ["1000", "R$ 1.000+"]] },
  { key: "slots", label: "Vagas", options: [["", "Qualquer"], ["available", "Com vagas"]] },
];

export function Filters({ current, organizers }: { current: Record<string, string | undefined>; organizers: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const [q, setQ] = useState(current.q ?? "");
  const [open, setOpen] = useState(false);

  const set = (patch: Record<string, string>) => {
    const next = new URLSearchParams(Object.entries(current).filter(([, v]) => v) as [string, string][]);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    start(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  };

  // Debounced search-as-you-type.
  useEffect(() => {
    if ((current.q ?? "") === q) return;
    const t = setTimeout(() => set({ q }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const advanced = ["mode", "price", "prize", "slots", "from", "org"].filter((k) => current[k]).length;
  const selectCls = "h-10 md:h-9 rounded-lg border border-input bg-input/30 px-3 text-base md:text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <div className="grid gap-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome" className="pl-9" aria-label="Buscar campeonato por nome" maxLength={60} />
          {pending && <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-label="Carregando" />}
        </div>
        <Button variant={advanced ? "default" : "outline"} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="filtros-avancados">
          <SlidersHorizontal /> <span className="hidden sm:inline">Filtros</span>{advanced > 0 && ` (${advanced})`}
        </Button>
      </div>

      <div className="scrollbar-none scroll-fade -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="tablist" aria-label="Status">
        {statusTabs.map((t) => {
          const on = (current.status ?? "") === t.value;
          return (
            <button key={t.value} role="tab" aria-selected={on} onClick={() => set({ status: t.value })}
              className={cn("shrink-0 rounded-full px-3.5 py-1.5 text-sm transition-colors", on ? "bg-primary font-medium text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}>
              {t.label}
            </button>
          );
        })}
      </div>

      {open && (
        <div id="filtros-avancados" className="grid gap-3 rounded-3xl bg-card p-4 sm:grid-cols-3 lg:grid-cols-6">
          {selects.map((s) => (
            <label key={s.key} className="grid gap-1 text-xs text-muted-foreground">
              {s.label}
              <select className={selectCls} value={current[s.key] ?? ""} onChange={(e) => set({ [s.key]: e.target.value })}>
                {s.options.map(([v, l]) => <option key={v} value={v} className="bg-popover">{l}</option>)}
              </select>
            </label>
          ))}
          <label className="grid gap-1 text-xs text-muted-foreground">
            A partir de
            <input type="date" className={selectCls} value={current.from ?? ""} onChange={(e) => set({ from: e.target.value })} />
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            Organizador
            <select className={selectCls} value={current.org ?? ""} onChange={(e) => set({ org: e.target.value })}>
              <option value="" className="bg-popover">Todos</option>
              {organizers.map((o) => <option key={o.id} value={o.id} className="bg-popover">{o.name}</option>)}
            </select>
          </label>
          {advanced > 0 && (
            <Button variant="ghost" size="sm" className="justify-self-start sm:col-span-3 lg:col-span-6"
              onClick={() => start(() => router.replace(pathname + (current.status ? `?status=${current.status}` : "")))}>
              <X /> Limpar filtros
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

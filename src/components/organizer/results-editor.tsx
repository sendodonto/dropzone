"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveResults } from "@/lib/actions/matches";
import { matchPoints, validateResultSheet, type ScoringConfig } from "@/lib/scoring";
import { formatPoints } from "@/lib/format";
import { cn } from "@/lib/utils";

type Row = { registration_id: string; name: string; placement: string; kills: string; bonus: string };

/** Result sheet for one match. Live point preview mirrors the DB trigger; the DB recomputes on save. */
export function ResultsEditor({ matchId, teams, existing, scoring, published }: {
  matchId: string;
  teams: { registration_id: string; name: string }[];
  existing: { registration_id: string; placement: number; kills: number; bonus_points: number }[];
  scoring: ScoringConfig;
  published: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [rows, setRows] = useState<Row[]>(() =>
    teams.map((t) => {
      const e = existing.find((x) => x.registration_id === t.registration_id);
      return { registration_id: t.registration_id, name: t.name, placement: e ? String(e.placement) : "", kills: e ? String(e.kills) : "0", bonus: e ? String(e.bonus_points) : "0" };
    }).sort((a, b) => (Number(a.placement) || 999) - (Number(b.placement) || 999)),
  );
  const filled = rows.filter((r) => r.placement !== "");
  const errors = useMemo(() => validateResultSheet(filled.map((r) => ({ placement: Number(r.placement), kills: Number(r.kills) })), teams.length), [filled, teams.length]);
  const update = (i: number, k: keyof Row, v: string) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [k]: v.replace(/[^\d-]/g, "") } : r)));

  const preview = (r: Row) => {
    try {
      return r.placement ? formatPoints(matchPoints(scoring, Number(r.placement), Number(r.kills || 0), Number(r.bonus || 0)).total) : "—";
    } catch { return "!"; }
  };

  const save = () =>
    start(async () => {
      if (errors.length) return void toast.error(errors[0]);
      const res = await saveResults(matchId, JSON.stringify(filled.map((r) => ({
        registration_id: r.registration_id, placement: Number(r.placement), kills: Number(r.kills || 0), bonus_points: Number(r.bonus || 0),
      }))));
      if (res.ok) { toast.success(res.message ?? "Salvo."); router.refresh(); } else toast.error(res.message);
    });

  const autoFill = () => setRows((rs) => {
    const used = new Set(rs.map((r) => Number(r.placement)).filter(Boolean));
    let next = 1;
    return rs.map((r) => {
      if (r.placement) return r;
      while (used.has(next)) next++;
      used.add(next);
      return { ...r, placement: String(next) };
    });
  });

  const inputCls = "h-10 w-12 sm:w-16 rounded-md border border-input bg-input/30 px-2 text-center text-base tabular-nums md:text-sm aria-invalid:border-destructive";
  return (
    <div className="grid gap-3">
      {published && <p className="rounded-lg bg-warning/10 p-2 text-xs text-warning">Resultados já publicados: qualquer correção fica registrada no histórico auditável.</p>}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th scope="col" className="px-3 py-2">Equipe</th><th scope="col" className="px-1 py-2 text-center sm:px-2">Pos.</th>
            <th scope="col" className="px-1 py-2 text-center sm:px-2">Abates</th>
            {scoring.maxBonus > 0 && <th scope="col" className="px-2 py-2 text-center">Bônus</th>}
            <th scope="col" className="px-2 py-2 text-right sm:px-3">Pts</th>
          </tr></thead>
          <tbody>
            {rows.map((r, i) => {
              const dup = r.placement !== "" && rows.filter((x) => x.placement === r.placement).length > 1;
              return (
                <tr key={r.registration_id} className="border-b last:border-0">
                  <td className="w-full max-w-0 truncate px-2 py-1.5 font-medium sm:px-3">{r.name}</td>
                  <td className="px-1 py-1.5 text-center sm:px-2">
                    <input aria-label={`Posição de ${r.name}`} inputMode="numeric" className={inputCls} value={r.placement} aria-invalid={dup || undefined}
                      onChange={(e) => update(i, "placement", e.target.value)} />
                  </td>
                  <td className="px-1 py-1.5 text-center sm:px-2">
                    <input aria-label={`Abates de ${r.name}`} inputMode="numeric" className={inputCls} value={r.kills} onChange={(e) => update(i, "kills", e.target.value)} />
                  </td>
                  {scoring.maxBonus > 0 && (
                    <td className="px-1 py-1.5 text-center sm:px-2">
                      <input aria-label={`Bônus de ${r.name}`} inputMode="numeric" className={inputCls} value={r.bonus} onChange={(e) => update(i, "bonus", e.target.value)} />
                    </td>
                  )}
                  <td className={cn("px-3 py-1.5 text-right font-heading font-bold tabular-nums", preview(r) === "!" && "text-destructive")}>{preview(r)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {errors.length > 0 && <p className="text-xs text-destructive" role="alert">{errors[0]}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={autoFill}><Wand2 /> Preencher posições vazias</Button>
        <Button type="button" onClick={save} disabled={pending || !filled.length}>
          {pending ? <Loader2 className="animate-spin" /> : <Save />} {published ? "Salvar correção" : "Salvar rascunho"}
        </Button>
      </div>
      {!published && (
        <p className="text-xs text-muted-foreground">
          {filled.length ? "Salve o rascunho. Depois, o botão Publicar resultado aparece aqui embaixo." : "Digite a colocação de cada equipe (1 = Booyah) e os abates para salvar o rascunho."}
        </p>
      )}
    </div>
  );
}

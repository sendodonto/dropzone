"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Crown, UserPlus } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ActionForm, Field, SubmitButton } from "@/components/shared/action-form";
import { registerTeam } from "@/lib/actions/tournaments";
import { cn } from "@/lib/utils";

export type EligibleTeam = {
  id: string; name: string; tag: string;
  members: { user_id: string; username: string; display_name: string; captain: boolean }[];
};

/** Squad picker + roster selection (starters and reserves). Rules are re-validated in Postgres. */
export function RegisterPanel({ tournamentId, teams, teamSize, reservesAllowed, isPrivate, onColor }: {
  tournamentId: string; teams: EligibleTeam[]; teamSize: number; reservesAllowed: number; isPrivate: boolean;
  onColor?: boolean; // sits on a blue field: white button, blue ink
}) {
  const [open, setOpen] = useState(false);
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const team = useMemo(() => teams.find((t) => t.id === teamId), [teams, teamId]);
  const [role, setRole] = useState<Record<string, "starter" | "reserve" | undefined>>({});

  const starters = Object.entries(role).filter(([, r]) => r === "starter").map(([u]) => u);
  const reserves = Object.entries(role).filter(([, r]) => r === "reserve").map(([u]) => u);

  const pickTeam = (id: string) => {
    setTeamId(id);
    const t = teams.find((x) => x.id === id);
    // Pre-select the first N members as starters to save taps on mobile.
    setRole(Object.fromEntries((t?.members ?? []).slice(0, teamSize).map((m) => [m.user_id, "starter" as const])));
  };

  if (!teams.length)
    return (
      <div className="grid gap-2 text-sm">
        <p className="text-muted-foreground">Você precisa ser capitão de um squad com pelo menos {teamSize} integrante(s).</p>
        <Link href="/painel/squads" className={cn(buttonVariants({ variant: "outline" }), onColor && "border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white")}><UserPlus /> Criar ou gerenciar squad</Link>
      </div>
    );

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o && !Object.keys(role).length) pickTeam(teamId); }}>
      <DialogTrigger render={<Button size="lg" className={cn("h-12 w-full", onColor && "bg-white text-primary hover:bg-white/90")} />}>Inscrever meu squad</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Inscrição</DialogTitle>
          <DialogDescription>Escolha {teamSize} titular(es){reservesAllowed ? ` e até ${reservesAllowed} reserva(s)` : ""}. Um jogador não pode estar em dois squads no mesmo campeonato.</DialogDescription>
        </DialogHeader>
        <ActionForm action={registerTeam.bind(null, tournamentId)} onSuccess={() => setOpen(false)}>
          {teams.length > 1 && (
            <label className="grid gap-1.5 text-sm font-medium">
              Squad
              <select name="team_id" value={teamId} onChange={(e) => pickTeam(e.target.value)}
                className="h-10 rounded-lg border border-input bg-input/30 px-3 text-base md:text-sm">
                {teams.map((t) => <option key={t.id} value={t.id} className="bg-popover">{t.name} [{t.tag}]</option>)}
              </select>
            </label>
          )}
          {teams.length === 1 && <input type="hidden" name="team_id" value={teamId} />}
          <fieldset className="grid gap-1.5">
            <legend className="mb-1 text-sm font-medium">Escalação</legend>
            {team?.members.map((m) => {
              const r = role[m.user_id];
              const set = (v: "starter" | "reserve" | undefined) => setRole((p) => ({ ...p, [m.user_id]: p[m.user_id] === v ? undefined : v }));
              return (
                <div key={m.user_id} className="flex items-center gap-2 rounded-lg border p-2">
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {m.display_name} <span className="text-xs text-muted-foreground">@{m.username}</span>
                    {m.captain && <Crown className="ml-1 inline size-3 text-primary-text" aria-label="Capitão" />}
                  </span>
                  <button type="button" onClick={() => set("starter")} aria-pressed={r === "starter"}
                    disabled={r !== "starter" && starters.length >= teamSize}
                    className={cn("rounded-md px-2 py-1 text-xs disabled:opacity-40", r === "starter" ? "bg-primary text-primary-foreground" : "bg-muted")}>Titular</button>
                  {reservesAllowed > 0 && (
                    <button type="button" onClick={() => set("reserve")} aria-pressed={r === "reserve"}
                      disabled={r !== "reserve" && reserves.length >= reservesAllowed}
                      className={cn("rounded-md px-2 py-1 text-xs disabled:opacity-40", r === "reserve" ? "bg-info text-background" : "bg-muted")}>Reserva</button>
                  )}
                </div>
              );
            })}
            {starters.map((u) => <input key={u} type="hidden" name="players[]" value={u} />)}
            {reserves.map((u) => <input key={u} type="hidden" name="reserves[]" value={u} />)}
            <p className={cn("text-xs", starters.length === teamSize ? "text-success" : "text-muted-foreground")}>
              {starters.length}/{teamSize} titulares · {reserves.length}/{reservesAllowed} reservas
            </p>
          </fieldset>
          {isPrivate && <Field name="invite_code" label="Código de convite" required maxLength={12} hint="Fornecido pelo organizador." />}
          <SubmitButton size="lg">Confirmar inscrição</SubmitButton>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}

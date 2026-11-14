"use client";
import { useState } from "react";
import Link from "next/link";
import { ShieldAlert, UserPlus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ActionForm, Field, SelectField, SubmitButton } from "@/components/shared/action-form";
import { acceptWager, confirmAdult, createWager } from "@/lib/actions/wagers";
import { maps } from "@/config/site";
import { gelOptions, toggleRules, weaponOptions } from "@/lib/wager-rules";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export type CaptainTeam = {
  id: string; name: string;
  members: { user_id: string; name: string; adult: boolean; me: boolean }[];
};

/** Age gate shown before creating or accepting: only the confirmation is stored, never the date. */
export function AdultConfirm() {
  return (
    <div className="grid gap-3 rounded-3xl bg-card p-5">
      <p className="flex items-start gap-2 text-sm"><ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
        Apostados envolvem dinheiro e são só para maiores de 18 anos. Confirme sua idade uma vez: guardamos só a confirmação, não a data.</p>
      <ActionForm action={confirmAdult} className="flex flex-wrap items-end gap-3">
        <Field name="birthdate" label="Data de nascimento" type="date" required className="w-56" />
        <SubmitButton>Confirmar que tenho 18+</SubmitButton>
      </ActionForm>
    </div>
  );
}

/** X1: you play. X2–X4: pick one of your squads and exactly N age-confirmed members. */
function RosterFields({ size, teams }: { size: number; teams: CaptainTeam[] }) {
  const usable = teams.filter((t) => t.members.length >= size);
  const [teamId, setTeamId] = useState(usable[0]?.id ?? "");
  const team = usable.find((t) => t.id === teamId);
  const [picked, setPicked] = useState<string[]>([]);
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < size ? [...p, id] : p));

  if (size === 1) return null;
  if (!usable.length)
    return (
      <div className="grid gap-2 text-sm">
        <p className="text-muted-foreground">Para X{size} você precisa ser capitão de um squad com pelo menos {size} integrantes.</p>
        <Link href="/painel/squads" className={cn(buttonVariants({ variant: "outline" }), "justify-self-start")}><UserPlus /> Criar ou gerenciar squad</Link>
      </div>
    );
  return (
    <div className="grid gap-3">
      <SelectField name="team_id" label="Squad" defaultValue={teamId} onChange={(v) => { setTeamId(v); setPicked([]); }}
        options={usable.map((t) => ({ value: t.id, label: t.name }))} />
      <fieldset className="grid gap-1.5">
        <legend className="mb-1 text-sm font-medium">Escalação ({picked.length}/{size})</legend>
        {team?.members.map((m) => (
          <label key={m.user_id} className={cn("flex min-h-11 items-center gap-3 rounded-xl border px-3 text-sm", !m.adult && "opacity-60")}>
            <input type="checkbox" name="players[]" value={m.user_id} checked={picked.includes(m.user_id)} disabled={!m.adult}
              onChange={() => toggle(m.user_id)} className="size-4 accent-[var(--primary)]" />
            <span className="flex-1">{m.name}{m.me && " (você)"}</span>
            {!m.adult && <span className="text-xs text-muted-foreground">não confirmou 18+</span>}
          </label>
        ))}
      </fieldset>
    </div>
  );
}

function MeAsPlayer({ size, meId }: { size: number; meId: string }) {
  return size === 1 ? <input type="hidden" name="players[]" value={meId} /> : null;
}

export function CreateWagerForm({ teams, meId, feePercent }: { teams: CaptainTeam[]; meId: string; feePercent: number }) {
  const [size, setSize] = useState(1);
  const [stake, setStake] = useState(5);
  const prize = Math.round(stake * 100 * size * 2 * (1 - feePercent / 100));
  return (
    <ActionForm action={createWager} key={size} className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField name="team_size" label="Modalidade" defaultValue={String(size)} onChange={(v) => setSize(Number(v))}
          options={[1, 2, 3, 4].map((n) => ({ value: String(n), label: `X${n} (${n}v${n})` }))} />
        <SelectField name="rounds" label="Formato" defaultValue="1"
          options={[{ value: "1", label: "1 partida" }, { value: "3", label: "Melhor de 3" }, { value: "5", label: "Melhor de 5" }]} />
        <SelectField name="map" label="Mapa" defaultValue="Bermuda" options={maps.map((m) => ({ value: m, label: m }))} />
      </div>
      <Field name="stake" label="Valor por jogador (R$)" type="number" min={1} max={500} step="0.5" required
        value={stake} onChange={(e) => setStake(Number(e.currentTarget.value) || 0)}
        hint={`Cada lado paga ${formatMoney(stake * 100 * size)}. Vencedor recebe ${formatMoney(prize)} (taxa de mediação ${feePercent}%).`} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField name="weapon" label="Armas" defaultValue="livre" options={weaponOptions.map((o) => ({ value: o.value, label: o.label }))} />
        <SelectField name="gel" label="Gelo (parede de gel)" defaultValue="normal" options={gelOptions.map((o) => ({ value: o.value, label: o.label }))} />
      </div>
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">Regras da sala</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {toggleRules.map((r) => (
            <label key={r.value} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5">
              <input type="checkbox" name="toggles[]" value={r.value} className="size-4 accent-[var(--primary)]" />
              {r.label}
            </label>
          ))}
        </div>
      </fieldset>
      <MeAsPlayer size={size} meId={meId} />
      <RosterFields size={size} teams={teams} />
      <SubmitButton size="lg" className="justify-self-start">Criar apostado</SubmitButton>
    </ActionForm>
  );
}

export function AcceptWagerForm({ wagerId, size, teams, meId }: { wagerId: string; size: number; teams: CaptainTeam[]; meId: string }) {
  return (
    <ActionForm action={acceptWager.bind(null, wagerId, size)} className="grid gap-4">
      <MeAsPlayer size={size} meId={meId} />
      <RosterFields size={size} teams={teams} />
      <SubmitButton size="lg" className="w-full sm:w-auto">Aceitar apostado</SubmitButton>
    </ActionForm>
  );
}

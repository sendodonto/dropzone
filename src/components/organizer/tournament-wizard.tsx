"use client";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, CalendarClock, Check, Gift, Plus, Ticket, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionForm, Field, SelectField, SubmitButton } from "@/components/shared/action-form";
import { ImageUpload } from "@/components/shared/client-bits";
import { saveTournament } from "@/lib/actions/tournaments";
import { entryLabel, formatDateTime, formatMoney, localInputToIso, modeLabel } from "@/lib/format";
import { TIEBREAKER_LABEL } from "@/lib/scoring";
import { regions } from "@/config/site";
import { ruleTemplates } from "@/components/organizer/rule-templates";
import { cn } from "@/lib/utils";
import type { GameMode, Tiebreaker } from "@/lib/types";

const STEPS = ["Informações", "Configurações", "Premiação", "Regulamento", "Revisão", "Publicação"] as const;
const FIELD_STEP: Record<string, number> = {
  name: 0, description: 0, mode: 0, region: 0, platform: 0, cover_url: 0, logo_url: 0,
  max_teams: 1, team_size: 1, reserves_allowed: 1, matches_count: 1, starts_at: 1, registration_opens_at: 1, registration_closes_at: 1, visibility: 1,
  entry_type: 2, entry_fee: 2, payment_instructions: 2, prize_pool: 2, prize_description: 2,
  rules: 3, placement_points: 3, kill_points: 3, max_bonus: 3, dispute_window_minutes: 3,
};
const SIZE: Record<GameMode, number> = { squad: 4, duo: 2, solo: 1 };

export type WizardDefaults = {
  name?: string; description?: string | null; cover_url?: string | null; logo_url?: string | null; mode?: GameMode;
  platform?: string; region?: string; max_teams?: number; reserves_allowed?: number; matches_count?: number;
  starts_at?: string; registration_opens_at?: string; registration_closes_at?: string; requires_approval?: boolean;
  visibility?: string; entry_type?: string; entry_fee?: number; payment_instructions?: string | null; prize_pool?: number; prize_description?: string | null;
  dispute_window_minutes?: number; rules?: string; season_id?: string | null; placement_points?: number[]; kill_points?: number; max_bonus?: number;
  tiebreakers?: Tiebreaker[]; prizes?: { position: number; label: string; amount: number }[]; sponsors?: { name: string; url: string }[];
};

export function TournamentWizard({ organizerId, organizerName, tournamentId, defaults = {}, paymentsEnabled, locked, seasons = [] }: {
  organizerId: string; organizerName: string; tournamentId?: string; defaults?: WizardDefaults; paymentsEnabled: boolean;
  seasons?: { id: string; name: string }[];
  locked?: boolean; // published: hide the publish step
}) {
  const steps = locked ? STEPS.slice(0, 5) : STEPS;
  const [step, setStep] = useState(0);
  const [v, setV] = useState({
    name: defaults.name ?? "", mode: defaults.mode ?? ("squad" as GameMode), max_teams: defaults.max_teams ?? 12,
    matches_count: defaults.matches_count ?? 4, starts_at: defaults.starts_at ?? "", entry_type: defaults.entry_type ?? "free",
    entry_fee: defaults.entry_fee ?? 0, prize_pool: defaults.prize_pool ?? 0, cover: defaults.cover_url ?? "",
    rules: defaults.rules ?? ruleTemplates[0].content, visibility: defaults.visibility ?? "public",
  });
  const [prizes, setPrizes] = useState(defaults.prizes ?? [{ position: 1, label: "1º lugar", amount: 0 }]);
  const [sponsors, setSponsors] = useState(defaults.sponsors ?? []);
  const [tiebreakers, setTiebreakers] = useState<Tiebreaker[]>(defaults.tiebreakers ?? ["wins", "kills", "best_placement", "last_match"]);
  const [publish, setPublish] = useState(true);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setV((p) => ({ ...p, [k]: e.target.type === "number" ? Number(e.target.value) : e.target.value }));

  const teamSize = SIZE[v.mode];
  const problems = useMemo(() => {
    const out: string[] = [];
    if (v.name.trim().length < 3) out.push("Informe o nome do campeonato.");
    if (!v.starts_at) out.push("Defina data e horário de início.");
    else if (!tournamentId && new Date(localInputToIso(v.starts_at)!) <= new Date()) out.push("A data de início precisa estar no futuro.");
    if ((v.entry_type === "paid" || v.entry_type === "external") && v.entry_fee <= 0) out.push("Informe o valor da inscrição.");
    return out;
  }, [v, tournamentId]);

  const moveTb = (i: number, d: -1 | 1) => setTiebreakers((t) => {
    const n = [...t]; const j = i + d;
    if (j < 0 || j >= n.length) return t;
    [n[i], n[j]] = [n[j], n[i]]; return n;
  });
  const allTb = Object.keys(TIEBREAKER_LABEL) as Tiebreaker[];

  return (
    <ActionForm id="tournament-wizard" preventEnterSubmit action={saveTournament.bind(null, organizerId, tournamentId ?? null)}
      onError={(fe) => { const s = Math.min(...Object.keys(fe).map((k) => FIELD_STEP[k] ?? 99)); if (s < 99) setStep(s); }}>
      {/* Stepper */}
      <ol className="scrollbar-none scroll-fade -mx-1 flex gap-1 overflow-x-auto px-1 pb-1" aria-label="Etapas">
        {steps.map((label, i) => (
          <li key={label} className="shrink-0">
            <button type="button" onClick={() => setStep(i)} aria-current={step === i ? "step" : undefined}
              className={cn("flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-colors",
                step === i ? "bg-primary font-medium text-primary-foreground" : i < step ? "bg-primary/15 text-primary-text" : "bg-muted text-muted-foreground")}>
              <span className="grid size-5 place-items-center rounded-full bg-background/20 text-xs">{i < step ? <Check className="size-3" /> : i + 1}</span>
              {label}
            </button>
          </li>
        ))}
      </ol>

      {/* 1 — Informações */}
      <fieldset className={cn("grid gap-4", step !== 0 && "hidden")}>
        <legend className="sr-only">Informações</legend>
        <Field name="name" label="Nome do campeonato" required maxLength={80} value={v.name} onChange={set("name")} />
        <Field name="description" label="Descrição" textarea rows={5} maxLength={4000} defaultValue={defaults.description ?? ""}
          hint="Apresente o campeonato. Aceita ## títulos, listas com - e **negrito**." />
        <div className="grid gap-4 sm:grid-cols-2">
          <ImageUpload name="cover_url" bucket="tournament-media" label="Capa (16:7)" aspect="wide" defaultValue={defaults.cover_url}
            onChange={(cover) => setV((p) => ({ ...p, cover }))} />
          <ImageUpload name="logo_url" bucket="tournament-media" label="Logo" defaultValue={defaults.logo_url} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField name="mode" label="Modalidade" defaultValue={v.mode}
            onChange={(m) => setV((p) => ({ ...p, mode: m as GameMode }))}
            options={[{ value: "squad", label: "Squad (4)" }, { value: "duo", label: "Duo (2)" }, { value: "solo", label: "Solo" }]} />
          <SelectField name="region" label="Região / servidor" options={regions} defaultValue={defaults.region ?? "BR"} />
          <SelectField name="platform" label="Plataforma" defaultValue={defaults.platform ?? "mobile"}
            options={[{ value: "mobile", label: "Mobile" }, { value: "emulator", label: "Emulador" }, { value: "mixed", label: "Misto" }]} />
        </div>
      </fieldset>

      {/* 2 — Configurações */}
      <fieldset className={cn("grid gap-4", step !== 1 && "hidden")}>
        <legend className="sr-only">Configurações</legend>
        <div className="grid gap-4 sm:grid-cols-4">
          <Field name="max_teams" label={v.mode === "solo" ? "Máx. jogadores" : "Máx. equipes"} type="number" min={2} max={100} value={v.max_teams} onChange={set("max_teams")} required />
          <div className="grid gap-1.5">
            <span className="text-sm font-medium">Jogadores/equipe</span>
            <input type="hidden" name="team_size" value={teamSize} />
            <p className="flex h-10 items-center rounded-lg border bg-muted/40 px-3 text-sm md:h-9">{teamSize} (pela modalidade)</p>
          </div>
          <Field name="reserves_allowed" label="Reservas" type="number" min={0} max={v.mode === "squad" ? 2 : 0}
            defaultValue={v.mode === "squad" ? defaults.reserves_allowed ?? 1 : 0} key={`res-${v.mode}`} />
          <Field name="matches_count" label="Quedas" type="number" min={1} max={20} value={v.matches_count} onChange={set("matches_count")} required />
        </div>
        <Field name="starts_at" label="Início (horário de Brasília)" type="datetime-local" required value={v.starts_at} onChange={set("starts_at")} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="registration_opens_at" label="Abertura das inscrições" type="datetime-local" defaultValue={defaults.registration_opens_at} hint="Vazio = abre ao publicar." />
          <Field name="registration_closes_at" label="Encerramento das inscrições" type="datetime-local" defaultValue={defaults.registration_closes_at} hint="Vazio = até o organizador fechar." />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField name="visibility" label="Visibilidade" defaultValue={v.visibility} onChange={(x) => setV((p) => ({ ...p, visibility: x }))}
            options={[{ value: "public", label: "Pública (aparece no marketplace)" }, { value: "unlisted", label: "Não listada (só com o link)" }, { value: "private", label: "Privada (inscrição com código)" }]} />
          <SelectField name="season_id" label="Temporada (opcional)" defaultValue={defaults.season_id ?? ""}
            options={[{ value: "", label: "Nenhuma" }, ...seasons.map((s) => ({ value: s.id, label: s.name }))]} />
          <label className="flex items-center gap-3 self-end rounded-lg border p-3 text-sm sm:col-span-2">
            <input type="checkbox" name="requires_approval" defaultChecked={defaults.requires_approval} className="size-4 accent-[var(--primary)]" />
            Aprovar inscrições manualmente
          </label>
        </div>
      </fieldset>

      {/* 3 — Premiação */}
      <fieldset className={cn("grid gap-4", step !== 2 && "hidden")}>
        <legend className="sr-only">Premiação e inscrições</legend>
        <SelectField name="entry_type" label="Tipo de participação" defaultValue={v.entry_type} onChange={(x) => setV((p) => ({ ...p, entry_type: x }))}
          options={[{ value: "free", label: "Gratuita" }, { value: "sponsored", label: "Gratuita com patrocínio" }, { value: "external", label: "Paga direto ao organizador (Pix)" }, { value: "paid", label: "Paga pela plataforma (requer habilitação)" }]} />
        {v.entry_type === "paid" && (
          <div className="grid gap-3 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
            <p className="flex gap-2"><AlertTriangle className="size-4 shrink-0 text-warning" aria-hidden />
              Inscrições pagas vinculadas a premiação exigem validação jurídica. {paymentsEnabled ? "Após salvar, solicite a habilitação ao administrador." : "Os pagamentos ainda não estão habilitados na plataforma: o campeonato só poderá ser publicado depois da aprovação."}
            </p>
            <Field name="entry_fee" label="Valor por equipe (R$)" type="number" min={0} step="0.01" value={v.entry_fee} onChange={set("entry_fee")} />
          </div>
        )}
        {v.entry_type === "external" && (
          <div className="grid gap-3 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
            <p className="flex gap-2"><AlertTriangle className="size-4 shrink-0 text-warning" aria-hidden />
              O pagamento é feito direto a você, fora da plataforma. Cada inscrição fica pendente até você aprovar depois de receber. A cobrança e a premiação são de sua responsabilidade.
            </p>
            <Field name="entry_fee" label="Valor por equipe (R$)" type="number" min={0} step="0.01" value={v.entry_fee} onChange={set("entry_fee")} />
            <Field name="payment_instructions" label="Como pagar" textarea rows={3} maxLength={500} defaultValue={defaults.payment_instructions ?? ""}
              placeholder="ex.: Pix para a chave X em nome de Y. Envie o comprovante com o nome do squad no WhatsApp Z." />
          </div>
        )}
        {v.entry_type !== "paid" && v.entry_type !== "external" && <input type="hidden" name="entry_fee" value="0" />}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="prize_pool" label="Premiação total anunciada (R$)" type="number" min={0} step="0.01" value={v.prize_pool} onChange={set("prize_pool")} hint="0 se não houver valor em dinheiro." />
          <Field name="prize_description" label="Descrição da premiação" maxLength={500} defaultValue={defaults.prize_description ?? ""} placeholder="ex.: troféu digital + skins sorteadas" />
        </div>
        <div className="grid gap-2">
          <span className="text-sm font-medium">Distribuição dos prêmios</span>
          {prizes.map((p, i) => (
            <div key={i} className="grid grid-cols-[3.5rem_1fr_7rem_auto] gap-2">
              <input aria-label="Posição" type="number" min={1} value={p.position} onChange={(e) => setPrizes((l) => l.map((x, j) => j === i ? { ...x, position: Number(e.target.value) } : x))} className="h-9 rounded-lg border border-input bg-input/30 px-2 text-sm" />
              <input aria-label="Descrição" value={p.label} maxLength={60} onChange={(e) => setPrizes((l) => l.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} className="h-9 rounded-lg border border-input bg-input/30 px-2 text-sm" />
              <input aria-label="Valor (R$)" type="number" min={0} step="0.01" value={p.amount} onChange={(e) => setPrizes((l) => l.map((x, j) => j === i ? { ...x, amount: Number(e.target.value) } : x))} className="h-9 rounded-lg border border-input bg-input/30 px-2 text-sm" />
              <Button type="button" variant="ghost" size="icon" aria-label="Remover prêmio" onClick={() => setPrizes((l) => l.filter((_, j) => j !== i))}><Trash2 /></Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="justify-self-start"
            onClick={() => setPrizes((l) => [...l, { position: l.length + 1, label: `${l.length + 1}º lugar`, amount: 0 }])}><Plus /> Adicionar posição</Button>
          <input type="hidden" name="prizes" value={JSON.stringify(prizes.filter((p) => p.label.trim()))} />
        </div>
        <div className="grid gap-2">
          <span className="text-sm font-medium">Patrocinadores</span>
          {sponsors.map((s, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <input aria-label="Nome do patrocinador" value={s.name} maxLength={60} onChange={(e) => setSponsors((l) => l.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} className="h-9 rounded-lg border border-input bg-input/30 px-2 text-sm" placeholder="Nome" />
              <input aria-label="Site do patrocinador" value={s.url} onChange={(e) => setSponsors((l) => l.map((x, j) => j === i ? { ...x, url: e.target.value } : x))} className="h-9 rounded-lg border border-input bg-input/30 px-2 text-sm" placeholder="https://" />
              <Button type="button" variant="ghost" size="icon" aria-label="Remover patrocinador" onClick={() => setSponsors((l) => l.filter((_, j) => j !== i))}><Trash2 /></Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => setSponsors((l) => [...l, { name: "", url: "" }])}><Plus /> Adicionar patrocinador</Button>
          <input type="hidden" name="sponsors" value={JSON.stringify(sponsors.filter((s) => s.name.trim()))} />
        </div>
        <p className="text-xs text-muted-foreground">A premiação anunciada é de responsabilidade do organizador. Premiações em dinheiro devem cumprir a legislação aplicável.</p>
      </fieldset>

      {/* 4 — Regulamento */}
      <fieldset className={cn("grid gap-4", step !== 3 && "hidden")}>
        <legend className="sr-only">Regulamento</legend>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Modelos:</span>
          {ruleTemplates.map((t) => (
            <Button key={t.id} type="button" variant="outline" size="sm" onClick={() => setV((p) => ({ ...p, rules: t.content }))}>{t.label}</Button>
          ))}
        </div>
        <Field name="rules" label="Regulamento" textarea rows={14} maxLength={20000} value={v.rules} onChange={set("rules")} className="font-mono" />
        <div className="grid gap-4 rounded-xl border p-4">
          <p className="font-medium">Sistema de pontuação</p>
          <Field name="placement_points" label="Pontos por colocação (1º, 2º, 3º…)" defaultValue={(defaults.placement_points ?? [12, 9, 8, 7, 6, 5, 4, 3, 2, 1]).join(", ")} hint="Separados por vírgula. Posições não listadas valem 0." />
          <div className="grid gap-4 sm:grid-cols-3">
            <Field name="kill_points" label="Pontos por abate" type="number" min={0} max={10} step="0.5" defaultValue={defaults.kill_points ?? 1} />
            <Field name="max_bonus" label="Bônus máximo por queda" type="number" min={0} max={50} defaultValue={defaults.max_bonus ?? 0} />
            <Field name="dispute_window_minutes" label="Prazo de contestação (min)" type="number" min={0} max={10080} defaultValue={defaults.dispute_window_minutes ?? 30} />
          </div>
          <div className="grid gap-2">
            <span className="text-sm font-medium">Critérios de desempate (em ordem)</span>
            <ol className="grid gap-1.5">
              {tiebreakers.map((tb, i) => (
                <li key={tb} className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-1.5 text-sm">
                  <span className="w-4 text-muted-foreground">{i + 1}.</span><span className="flex-1">{TIEBREAKER_LABEL[tb]}</span>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label="Subir" onClick={() => moveTb(i, -1)}><ArrowUp /></Button>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label="Descer" onClick={() => moveTb(i, 1)}><ArrowDown /></Button>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label="Remover critério" disabled={tiebreakers.length === 1} onClick={() => setTiebreakers((t) => t.filter((x) => x !== tb))}><Trash2 /></Button>
                </li>
              ))}
            </ol>
            <div className="flex flex-wrap gap-1.5">
              {allTb.filter((tb) => !tiebreakers.includes(tb)).map((tb) => (
                <Button key={tb} type="button" variant="outline" size="xs" onClick={() => setTiebreakers((t) => [...t, tb])}><Plus /> {TIEBREAKER_LABEL[tb]}</Button>
              ))}
            </div>
            <input type="hidden" name="tiebreakers" value={tiebreakers.join(",")} />
          </div>
        </div>
      </fieldset>

      {/* 5 — Revisão */}
      <div className={cn("grid gap-4", step !== 4 && "hidden")}>
        <p className="text-sm text-muted-foreground">Assim o campeonato aparecerá no marketplace:</p>
        <div className="max-w-sm overflow-hidden rounded-3xl bg-card">
          <div className="relative aspect-[16/7] bg-primary">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {v.cover && <img src={v.cover} alt="" className="size-full object-cover" />}
            <span className="absolute top-3 left-3 rounded-md bg-primary/90 px-2 py-0.5 text-xs font-medium text-primary-foreground">Inscrições abertas</span>
          </div>
          <div className="grid gap-2 p-4">
            <p className="font-heading text-base font-semibold">{v.name || "Nome do campeonato"}</p>
            <p className="text-xs text-muted-foreground">{organizerName}</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><CalendarClock className="size-3.5" />{v.starts_at ? formatDateTime(localInputToIso(v.starts_at)) : "—"}</span>
              <span className="flex items-center gap-1"><Users className="size-3.5" />{modeLabel[v.mode]}</span>
              <span className="flex items-center gap-1"><Ticket className="size-3.5" />{v.entry_type === "paid" || v.entry_type === "external" ? formatMoney(v.entry_fee * 100) : entryLabel[v.entry_type as "free"]}</span>
              <span className="flex items-center gap-1"><Gift className="size-3.5" />{v.prize_pool > 0 ? formatMoney(v.prize_pool * 100) : "—"}</span>
            </div>
            <p className="text-xs">0/{v.max_teams} {v.mode === "solo" ? "jogadores" : "squads"} · {v.matches_count} quedas</p>
          </div>
        </div>
        {problems.length > 0 ? (
          <ul className="grid gap-1 rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">
            {problems.map((p) => <li key={p}>• {p}</li>)}
          </ul>
        ) : <p className="text-sm text-success">Tudo pronto para salvar.</p>}
        {locked && <SubmitButton size="lg" className="justify-self-start">Salvar alterações</SubmitButton>}
      </div>

      {/* 6 — Publicação */}
      {!locked && (
        <div className={cn("grid gap-4", step !== 5 && "hidden")}>
          <div className="grid gap-2 sm:grid-cols-2">
            {[{ val: true, t: "Publicar agora", d: "Aparece no marketplace e abre inscrições." }, { val: false, t: "Salvar como rascunho", d: "Só você vê. Publique quando quiser." }].map((o) => (
              <label key={o.t} className={cn("cursor-pointer rounded-xl border p-4", publish === o.val && "border-primary bg-primary/5")}>
                <input type="radio" name="publish_choice" className="sr-only" checked={publish === o.val} onChange={() => setPublish(o.val)} />
                <p className="font-medium">{o.t}</p><p className="text-sm text-muted-foreground">{o.d}</p>
              </label>
            ))}
          </div>
          <input type="hidden" name="publish" value={publish ? "true" : "false"} />
          <SubmitButton size="lg" className="justify-self-start">{publish ? "Publicar campeonato" : "Salvar rascunho"}</SubmitButton>
        </div>
      )}

      <div className="flex justify-between border-t pt-4">
        <Button type="button" variant="ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}><ArrowLeft /> Voltar</Button>
        {step < steps.length - 1 && <Button type="button" onClick={() => setStep((s) => s + 1)}>Próximo <ArrowRight /></Button>}
      </div>
    </ActionForm>
  );
}

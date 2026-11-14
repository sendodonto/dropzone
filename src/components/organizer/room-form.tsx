"use client";
import { useState } from "react";
import { ActionForm, Field, SelectField, SubmitButton } from "@/components/shared/action-form";
import { saveRoom } from "@/lib/actions/matches";
import { isoToLocalInput } from "@/lib/format";
import { maps } from "@/config/site";
import type { Match, MatchRoom, RoomAudience } from "@/lib/types";

export function RoomForm({ match, room, teams, targets }: {
  match: Match; room?: MatchRoom; teams: { registration_id: string; name: string }[]; targets: string[];
}) {
  const [audience, setAudience] = useState<RoomAudience>(room?.audience ?? "confirmed");
  return (
    <ActionForm action={saveRoom} idPrefix={`queda${match.number}`}>
      <input type="hidden" name="match_id" value={match.id} />
      <div className="grid items-start gap-4 sm:grid-cols-2">
        <SelectField name="map" label="Mapa" defaultValue={match.map} options={maps.map((m) => ({ value: m, label: m }))} />
        <Field name="scheduled_at" label="Horário da partida" type="datetime-local" defaultValue={isoToLocalInput(match.scheduled_at)} />
        <Field name="room_code" label="ID da sala" required maxLength={30} defaultValue={room?.room_code} autoComplete="off" />
        <Field name="room_password" label="Senha" maxLength={30} defaultValue={room?.room_password ?? ""} autoComplete="off" />
        <Field name="opens_at" label="Liberar credenciais às" type="datetime-local" defaultValue={isoToLocalInput(room?.opens_at)} hint="Vazio = assim que publicar." />
        <SelectField name="audience" label="Quem pode ver" defaultValue={audience} onChange={(v) => setAudience(v as RoomAudience)}
          options={[{ value: "confirmed", label: "Equipes confirmadas" }, { value: "all_participants", label: "Todos os inscritos (inclui pendentes)" }, { value: "specific", label: "Equipes específicas" }]} />
      </div>
      {audience === "specific" && (
        <fieldset className="grid gap-1.5 rounded-lg border p-3">
          <legend className="px-1 text-sm font-medium">Equipes com acesso</legend>
          <div className="grid gap-1 sm:grid-cols-2">
            {teams.map((t) => (
              <label key={t.registration_id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="targets[]" value={t.registration_id} defaultChecked={targets.includes(t.registration_id)} className="size-4 accent-[var(--primary)]" />{t.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <Field name="instructions" label="Instruções" textarea rows={2} maxLength={1000} defaultValue={room?.instructions ?? ""} />
      <div className="flex flex-wrap gap-2">
        <SubmitButton variant="outline" name="publish" value="false">Salvar</SubmitButton>
        <SubmitButton name="publish" value="true">{room?.published ? "Salvar e manter publicada" : "Salvar e publicar"}</SubmitButton>
      </div>
    </ActionForm>
  );
}

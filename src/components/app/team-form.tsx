"use client";
import { ActionForm, Field, SubmitButton } from "@/components/shared/action-form";
import { ImageUpload } from "@/components/shared/client-bits";
import type { ActionResult, Team } from "@/lib/types";

export function TeamForm({ action, team, submitLabel }: {
  action: (s: ActionResult | null, fd: FormData) => Promise<ActionResult>;
  team?: Pick<Team, "name" | "tag" | "description" | "logo_url">;
  submitLabel: string;
}) {
  return (
    <ActionForm action={action} resetOnSuccess={!team}>
      <ImageUpload name="logo_url" bucket="team-logos" label="Logo (opcional)" defaultValue={team?.logo_url} />
      <div className="grid gap-4 sm:grid-cols-[1fr_7rem]">
        <Field name="name" label="Nome do squad" required maxLength={32} defaultValue={team?.name} />
        <Field name="tag" label="Tag" required maxLength={5} defaultValue={team?.tag} hint="2–5 caracteres"
          onChange={(e) => (e.currentTarget.value = e.currentTarget.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} />
      </div>
      <Field name="description" label="Descrição" textarea rows={3} maxLength={500} defaultValue={team?.description ?? ""} />
      <SubmitButton>{submitLabel}</SubmitButton>
    </ActionForm>
  );
}

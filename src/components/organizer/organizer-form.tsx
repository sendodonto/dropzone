"use client";
import { ActionForm, Field, SubmitButton } from "@/components/shared/action-form";
import { ImageUpload } from "@/components/shared/client-bits";
import type { ActionResult, Organizer } from "@/lib/types";

export function OrganizerForm({ action, org, submitLabel }: {
  action: (s: ActionResult | null, fd: FormData) => Promise<ActionResult>; org?: Organizer; submitLabel: string;
}) {
  return (
    <ActionForm action={action}>
      <ImageUpload name="logo_url" bucket="tournament-media" label="Logo do organizador" defaultValue={org?.logo_url} />
      <Field name="name" label="Nome do organizador" required maxLength={60} defaultValue={org?.name} placeholder="ex.: Liga Noturna FF" />
      <Field name="description" label="Sobre" textarea rows={3} maxLength={1000} defaultValue={org?.description ?? ""} />
      <Field name="contact_url" label="Link de contato (Discord, Instagram…)" type="url" defaultValue={org?.contact_url ?? ""} placeholder="https://" />
      <SubmitButton className="justify-self-start">{submitLabel}</SubmitButton>
    </ActionForm>
  );
}

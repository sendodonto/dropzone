"use client";
import { ActionForm, Field, SelectField, SubmitButton } from "@/components/shared/action-form";
import { ImageUpload } from "@/components/shared/client-bits";
import { updateProfile } from "@/lib/actions/auth";
import { regions } from "@/config/site";
import type { Profile } from "@/lib/types";

export function ProfileForm({ profile }: { profile: Profile }) {
  return (
    <ActionForm action={updateProfile}>
      <ImageUpload name="avatar_url" bucket="avatars" label="Avatar" defaultValue={profile.avatar_url} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="username" label="Username" defaultValue={profile.username ?? ""} required maxLength={20}
          onChange={(e) => (e.currentTarget.value = e.currentTarget.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} />
        <Field name="display_name" label="Nome de exibição" defaultValue={profile.display_name ?? ""} required maxLength={40} />
      </div>
      <Field name="ff_id" label="ID do Free Fire" inputMode="numeric" defaultValue={profile.ff_id ?? ""} maxLength={15} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField name="region" label="Região" options={regions} defaultValue={profile.region ?? "BR"} />
        <SelectField name="preferred_mode" label="Modalidade preferida" defaultValue={profile.preferred_mode ?? "squad"}
          options={[{ value: "squad", label: "Squad" }, { value: "duo", label: "Duo" }, { value: "solo", label: "Solo" }]} />
      </div>
      <Field name="bio" label="Bio" textarea rows={3} maxLength={280} defaultValue={profile.bio ?? ""} />
      <SubmitButton className="justify-self-start">Salvar perfil</SubmitButton>
    </ActionForm>
  );
}

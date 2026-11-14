"use client";
import { Building2, Gamepad2, Layers } from "lucide-react";
import { ActionForm, Field, FieldError, SelectField, SubmitButton } from "@/components/shared/action-form";
import { completeOnboarding } from "@/lib/actions/auth";
import { regions } from "@/config/site";
import type { Profile } from "@/lib/types";

const intents = [
  { value: "play", label: "Jogar campeonatos", icon: Gamepad2 },
  { value: "organize", label: "Organizar torneios", icon: Building2 },
  { value: "both", label: "Os dois", icon: Layers },
];

export function OnboardingForm({ profile }: { profile: Profile }) {
  return (
    <ActionForm action={completeOnboarding} className="mt-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="username" label="Username" defaultValue={profile.username ?? ""} required maxLength={20}
          onChange={(e) => (e.currentTarget.value = e.currentTarget.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} />
        <Field name="display_name" label="Nome de exibição" defaultValue={profile.display_name ?? ""} required maxLength={40} />
      </div>
      <Field name="ff_id" label="ID do Free Fire (opcional)" inputMode="numeric" defaultValue={profile.ff_id ?? ""}
        hint="Ajuda organizadores a conferir sua conta na sala." maxLength={15} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField name="region" label="Região" options={regions} defaultValue={profile.region ?? "BR"} />
        <SelectField name="preferred_mode" label="Modalidade preferida" defaultValue={profile.preferred_mode ?? "squad"}
          options={[{ value: "squad", label: "Squad" }, { value: "duo", label: "Duo" }, { value: "solo", label: "Solo" }]} />
      </div>
      <fieldset className="grid gap-2">
        <legend className="mb-1.5 text-sm font-medium">O que você quer fazer aqui?</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {intents.map(({ value, label, icon: Icon }) => (
            <label key={value} className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm transition-colors hover:border-primary/40 has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50">
              <input type="radio" name="intent" value={value} defaultChecked={value === (profile.intent ?? "play")} className="sr-only" />
              <Icon className="size-4 text-primary-text" aria-hidden />{label}
            </label>
          ))}
        </div>
        <FieldError name="intent" />
      </fieldset>
      <SubmitButton size="lg" className="w-full">Concluir e entrar</SubmitButton>
    </ActionForm>
  );
}

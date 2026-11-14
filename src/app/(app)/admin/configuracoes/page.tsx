import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/ui-bits";
import { createClient } from "@/lib/supabase/server";
import { SettingControl } from "./setting-control";

export const metadata: Metadata = { title: "Configurações · Admin" };

const meta: Record<string, { label: string; help: string; kind: "bool" | "number" | "text"; danger?: boolean }> = {
  wagers_enabled: { label: "Apostados ativos", help: "Desligado: ninguém cria nem aceita apostados novos. Os em andamento continuam.", kind: "bool" },
  wager_fee_percent: { label: "Taxa de mediação dos apostados (%)", help: "Descontada do pote. Vale para apostados criados depois da mudança.", kind: "number" },
  wager_payment_instructions: { label: "Instruções de Pix dos apostados", help: "Aparece para os dois lados quando o apostado é aceito.", kind: "text" },
  organizing_open: { label: "Qualquer usuário pode criar campeonatos", help: "Desligado: só organizadores oficiais e administradores criam e publicam campeonatos.", kind: "bool" },
  organizer_requires_approval: { label: "Aprovar novos organizadores manualmente", help: "Novos perfis de organizador ficam pendentes até aprovação.", kind: "bool" },
  payments_enabled: { label: "Pagamentos reais habilitados", help: "Só ative após validação jurídica e integração com provedor. Permite aprovar inscrições pagas.", kind: "bool", danger: true },
  subscriptions_billing_enabled: { label: "Cobrança de assinaturas (plano Pro)", help: "Depende da mesma integração financeira.", kind: "bool", danger: true },
  platform_fee_percent: { label: "Comissão da plataforma (%)", help: "Aplicada a transações legalmente habilitadas.", kind: "number" },
  announcement_banner: { label: "Aviso global", help: "Texto curto exibido no topo do site. Vazio = sem aviso.", kind: "text" },
};

export default async function AdminSettings() {
  const supabase = await createClient();
  const { data } = await supabase.from("platform_settings").select("key, value, updated_at").order("key");
  return (
    <div className="grid max-w-3xl gap-6">
      <PageHeader title="Configurações globais" description="Cada alteração é registrada nos logs administrativos com valor anterior e novo." />
      <ul className="divide-y rounded-3xl bg-card">
        {(data ?? []).filter((s) => meta[s.key]).map((s) => (
          <li key={s.key} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="font-medium">{meta[s.key].label}</p>
              <p className="text-sm text-muted-foreground">{meta[s.key].help}</p>
            </div>
            <SettingControl settingKey={s.key} kind={meta[s.key].kind} value={s.value} danger={meta[s.key].danger} />
          </li>
        ))}
      </ul>
    </div>
  );
}

import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/ui-bits";
import { RichText } from "@/components/shared/rich-text";
import { site } from "@/config/site";

export const metadata: Metadata = { title: "Privacidade" };

// Template text — must be reviewed for LGPD compliance before launch.
const text = `**Modelo provisório — revisar conformidade com a LGPD antes do lançamento.**

## Dados que coletamos
Email, nome de exibição, username, ID do ${site.game} (opcional), região, avatar e histórico de participação em campeonatos.

## Como usamos
Para autenticação, inscrições, exibição de rankings e perfis públicos, comunicação sobre campeonatos e moderação.

## O que é público
Username, nome de exibição, avatar, squads e resultados de campeonatos. Seu email nunca é exibido.

## Pagamentos
A plataforma não armazena dados de cartão. Quando pagamentos forem habilitados, serão processados por provedor certificado.

## Seus direitos
Você pode solicitar acesso, correção ou exclusão dos seus dados pelo email ${site.support.email}.`;

export default function PrivacyPage() {
  return (
    <div className="mx-auto grid max-w-3xl gap-6 px-4 py-10 sm:px-6">
      <PageHeader title="Política de privacidade" />
      <RichText text={text} />
    </div>
  );
}

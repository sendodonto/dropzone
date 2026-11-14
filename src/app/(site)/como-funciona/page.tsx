import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, ClipboardList, Crosshair, Flag, KeyRound, ListOrdered, MessageSquareWarning, ShieldCheck, Trophy, Users } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader, Section } from "@/components/shared/ui-bits";
import { site } from "@/config/site";

export const metadata: Metadata = { title: "Como funciona" };

const player = [
  [Users, "Crie seu squad", "Defina nome, tag e logo. Convide amigos pelo username; eles aceitam pelo painel."],
  [ClipboardList, "Inscreva-se", "O capitão escolhe titulares e reserva. Um jogador não pode jogar por dois squads no mesmo campeonato."],
  [KeyRound, "Receba a sala", "ID e senha da sala personalizada aparecem só para equipes autorizadas, no horário definido pelo organizador."],
  [ListOrdered, "Acompanhe a classificação", "A pontuação é calculada automaticamente a cada queda publicada."],
  [MessageSquareWarning, "Conteste se precisar", "Cada queda tem prazo de contestação. Tudo fica registrado."],
  [Trophy, "Suba no ranking", "Campeonatos finalizados contam para rankings, temporadas e conquistas."],
] as const;
const organizer = [
  [Flag, "Crie em etapas", "Informações, configurações, premiação, regulamento com modelos, revisão e publicação."],
  [ShieldCheck, "Controle as inscrições", "Aprovação manual opcional, remoção com justificativa e avisos aos participantes."],
  [KeyRound, "Gerencie salas", "Cadastre ID, senha, mapa e horário. Publique para todos, só confirmados ou squads específicos."],
  [Crosshair, "Lance resultados", "Colocação e abates por squad; correções ficam no histórico auditável."],
  [BadgeCheck, "Finalize", "Ao finalizar, a classificação final vira resultado verificado para os rankings."],
] as const;

export default function HowItWorksPage() {
  return (
    <div className="mx-auto grid max-w-5xl gap-12 px-4 py-10 sm:px-6">
      <PageHeader title="Como funciona" description={`${site.name} conecta jogadores e organizadores de campeonatos de ${site.game}.`} />
      <Steps title="Para jogadores" items={player} />
      <Steps title="Para organizadores" items={organizer} />
      <Section title="Sobre salas e integrações">
        <p className="text-sm text-muted-foreground">
          A criação de salas no jogo é feita manualmente pelo organizador — não existe integração oficial automática com o {site.game}.
          A plataforma cuida de guardar, proteger e liberar as credenciais na hora certa para as equipes certas.
        </p>
      </Section>
      <Section title="Premiações e pagamentos">
        <p className="text-sm text-muted-foreground">
          Campeonatos podem ser gratuitos, patrocinados ou privados. Inscrições pagas e premiações em dinheiro dependem de validação jurídica
          e de habilitação pela administração, e não estão disponíveis no momento. A premiação anunciada em cada campeonato é de responsabilidade do organizador.
        </p>
      </Section>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href="/cadastro" className={buttonVariants({ size: "lg" })}>Criar conta</Link>
        <Link href="/campeonatos" className={buttonVariants({ size: "lg", variant: "outline" })}>Ver campeonatos</Link>
      </div>
    </div>
  );
}

function Steps({ title, items }: { title: string; items: readonly (readonly [typeof Users, string, string])[] }) {
  return (
    <Section title={title}>
      <ol className="grid gap-x-10 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(([Icon, t, d], i) => (
          <li key={t} className="border-t pt-4">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary-text"><Icon className="size-4" aria-hidden /></span>
              <span className="font-heading text-sm text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
            </div>
            <p className="mt-3 font-medium">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{d}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

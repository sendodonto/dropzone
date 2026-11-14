import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/ui-bits";
import { RichText } from "@/components/shared/rich-text";
import { site } from "@/config/site";

export const metadata: Metadata = { title: "Termos de uso" };

// Template text — must be reviewed by a lawyer before launch.
const text = `**Modelo provisório — revisar com assessoria jurídica antes do lançamento.**

## 1. Sobre a plataforma
${site.name} é uma ferramenta para organizar e participar de campeonatos amadores de ${site.game}. ${site.disclaimer}

## 2. Contas
Você é responsável pelas informações da sua conta. É proibido criar contas falsas, se passar por outra pessoa ou compartilhar acesso.

## 3. Organizadores
Organizadores são responsáveis pelo regulamento, pela condução das partidas, pelos resultados lançados e pela premiação que anunciarem.
Premiações em dinheiro e inscrições pagas só podem ocorrer quando habilitadas pela plataforma, conforme a legislação aplicável.

## 4. Conduta
- Proibido uso de trapaças, programas ilegais ou exploração de falhas.
- Proibido assédio, discurso de ódio ou qualquer comportamento abusivo.
- Proibido manipular resultados ou combinar colocações.
- Denúncias falsas podem resultar em suspensão.

## 5. Moderação
A plataforma pode suspender contas, ocultar campeonatos e remover conteúdo que viole estes termos. As decisões são registradas.

## 6. Contato
${site.support.email || "Pelos canais de contato da plataforma."}`;

export default function TermsPage() {
  return (
    <div className="mx-auto grid max-w-3xl gap-6 px-4 py-10 sm:px-6">
      <PageHeader title="Termos de uso" />
      <div id="conduta"><RichText text={text} /></div>
    </div>
  );
}

"use client";
import { ActionButton } from "@/components/shared/action-button";
import { resolveDispute } from "@/lib/actions/matches";
import { resolveReport } from "@/lib/actions/community";

// Client wrappers: they pass the typed decision text to server actions.
export function DisputeDecision({ id }: { id: string }) {
  return (
    <div className="flex gap-2">
      <ActionButton action={(r) => resolveDispute(id, false, r ?? "")} variant="outline" size="sm"
        reason={{ label: "Justificativa da recusa", required: true }} confirm={{ title: "Recusar contestação" }}>Recusar</ActionButton>
      <ActionButton action={(r) => resolveDispute(id, true, r ?? "")} size="sm"
        reason={{ label: "Decisão (o que será corrigido)", required: true }} confirm={{ title: "Aceitar contestação", description: "Depois, corrija o resultado na aba Resultados — a alteração fica no histórico." }}>Aceitar</ActionButton>
    </div>
  );
}

export function ReportDecision({ id }: { id: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <ActionButton action={(r) => resolveReport(id, "in_review", r || "Em análise")} variant="ghost" size="sm">Em análise</ActionButton>
      <ActionButton action={(r) => resolveReport(id, "dismissed", r ?? "")} variant="outline" size="sm"
        reason={{ label: "Motivo do arquivamento", required: true }} confirm={{ title: "Arquivar denúncia" }}>Arquivar</ActionButton>
      <ActionButton action={(r) => resolveReport(id, "resolved", r ?? "")} size="sm"
        reason={{ label: "Decisão e providências", required: true }} confirm={{ title: "Resolver denúncia" }}>Resolver</ActionButton>
    </div>
  );
}

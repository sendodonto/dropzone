"use client";
import { CirclePlay, DoorClosed, DoorOpen, Flag, Rocket, Send, Trash2, XCircle } from "lucide-react";
import { ActionButton } from "@/components/shared/action-button";
import { deleteDraft, publishTournament, requestPaidEntry, setTournamentStatus } from "@/lib/actions/tournaments";
import { finalizeTournament } from "@/lib/actions/matches";
import type { Tournament } from "@/lib/types";

/** Lifecycle controls; every transition is validated again in Postgres (set_tournament_status etc.). */
export function StatusActions({ t }: { t: Pick<Tournament, "id" | "status" | "entry_type" | "paid_request_status" | "payments_enabled"> }) {
  const s = t.status;
  return (
    <div className="flex flex-wrap gap-2">
      {s === "draft" && (
        <>
          <ActionButton action={() => publishTournament(t.id)} confirm={{ title: "Publicar campeonato?", description: "Ele aparecerá no marketplace e as inscrições serão abertas." }}><Rocket /> Publicar</ActionButton>
          <ActionButton action={() => deleteDraft(t.id)} variant="ghost" confirm={{ title: "Excluir rascunho?", destructive: true, confirmLabel: "Excluir" }}><Trash2 /> Excluir rascunho</ActionButton>
        </>
      )}
      {s === "draft" && t.entry_type === "paid" && !t.payments_enabled && ["none", "denied"].includes(t.paid_request_status) && (
        <ActionButton action={() => requestPaidEntry(t.id)} variant="outline"><Send /> Solicitar habilitação de inscrição paga</ActionButton>
      )}
      {s === "registration_open" && (
        <ActionButton action={() => setTournamentStatus(t.id, "registration_closed")} variant="outline"><DoorClosed /> Encerrar inscrições</ActionButton>
      )}
      {s === "registration_closed" && (
        <ActionButton action={() => setTournamentStatus(t.id, "registration_open")} variant="outline"><DoorOpen /> Reabrir inscrições</ActionButton>
      )}
      {(s === "registration_open" || s === "registration_closed") && (
        <ActionButton action={() => setTournamentStatus(t.id, "live")}
          confirm={{ title: "Iniciar campeonato?", description: "As inscrições são encerradas e inscrições pendentes são recusadas automaticamente. Resultados só podem ser lançados após o início." }}>
          <CirclePlay /> Iniciar campeonato
        </ActionButton>
      )}
      {s === "live" && (
        <ActionButton action={() => finalizeTournament(t.id)}
          confirm={{ title: "Finalizar campeonato?", description: "A classificação final é congelada, conquistas são distribuídas e os resultados passam a contar para os rankings. Não é possível desfazer." }}>
          <Flag /> Finalizar campeonato
        </ActionButton>
      )}
      {["draft", "registration_open", "registration_closed", "live"].includes(s) && s !== "draft" && (
        <ActionButton action={(reason) => setTournamentStatus(t.id, "cancelled", reason)} variant="destructive"
          reason={{ label: "Motivo do cancelamento (enviado aos participantes)", required: true }}
          confirm={{ title: "Cancelar campeonato?", destructive: true, confirmLabel: "Cancelar campeonato" }}>
          <XCircle /> Cancelar
        </ActionButton>
      )}
    </div>
  );
}

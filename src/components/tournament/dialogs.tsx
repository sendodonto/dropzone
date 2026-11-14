"use client";
import { useState } from "react";
import { Flag, MessageSquareWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ActionForm, Field, SelectField, SubmitButton } from "@/components/shared/action-form";
import { createReport } from "@/lib/actions/community";
import { openDispute } from "@/lib/actions/matches";
import { reportReasonLabel } from "@/lib/format";

export function ReportDialog({ targetType, targetId, tournamentId, label = "Denunciar" }: {
  targetType: "user" | "team" | "tournament" | "match"; targetId: string; tournamentId?: string; label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="sm" className="text-muted-foreground" />}><Flag /> {label}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar denúncia</DialogTitle>
          <DialogDescription>Denúncias são analisadas pela moderação{tournamentId ? " e pelo organizador do campeonato" : ""}. Falsas denúncias podem gerar suspensão.</DialogDescription>
        </DialogHeader>
        <ActionForm action={createReport} onSuccess={() => setOpen(false)}>
          <input type="hidden" name="target_type" value={targetType} />
          <input type="hidden" name="target_id" value={targetId} />
          <input type="hidden" name="tournament_id" value={tournamentId ?? ""} />
          <SelectField name="reason" label="Motivo" options={Object.entries(reportReasonLabel).map(([value, label]) => ({ value, label }))} />
          <Field name="description" label="O que aconteceu?" textarea rows={4} required minLength={10} maxLength={2000} />
          <Field name="evidence" label="Links de evidência (opcional)" textarea rows={2} hint="Vídeos, prints hospedados etc. Um por linha, até 5." />
          <SubmitButton variant="destructive">Enviar denúncia</SubmitButton>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}

export function DisputeDialog({ matchId, registrationId, matchNumber }: { matchId: string; registrationId: string; matchNumber: number }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}><MessageSquareWarning /> Contestar resultado</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Contestar queda {matchNumber}</DialogTitle>
          <DialogDescription>O organizador analisa e registra a decisão. Envie provas (vídeo/print) sempre que possível.</DialogDescription>
        </DialogHeader>
        <ActionForm action={openDispute} onSuccess={() => setOpen(false)}>
          <input type="hidden" name="match_id" value={matchId} />
          <input type="hidden" name="registration_id" value={registrationId} />
          <Field name="reason" label="Descreva o problema" textarea rows={4} required minLength={10} maxLength={2000} />
          <Field name="evidence" label="Links de evidência" textarea rows={2} hint="Um por linha." />
          <SubmitButton>Enviar contestação</SubmitButton>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}

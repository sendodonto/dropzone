"use client";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { ActionButton } from "@/components/shared/action-button";
import { setSetting } from "@/lib/actions/admin";

export function SettingControl({ settingKey, kind, value, danger }: { settingKey: string; kind: "bool" | "number" | "text"; value: unknown; danger?: boolean }) {
  const [v, setV] = useState(kind === "bool" ? Boolean(value) : String(value ?? ""));
  if (kind === "bool")
    return (
      <div className="flex items-center gap-3">
        <Switch checked={Boolean(v)} onCheckedChange={(c) => setV(c)} aria-label="Alternar" />
        {v !== Boolean(value) && (
          <ActionButton action={() => setSetting(settingKey, Boolean(v))} size="sm"
            confirm={danger ? { title: "Confirmar alteração sensível?", description: "Esta opção afeta movimentação financeira real.", destructive: true } : undefined}>
            Salvar
          </ActionButton>
        )}
      </div>
    );
  return (
    <div className="flex items-center gap-2">
      <Input value={String(v)} onChange={(e) => setV(e.target.value)} type={kind === "number" ? "number" : "text"} className="w-48" maxLength={200} aria-label="Valor" />
      {String(v) !== String(value ?? "") && (
        <ActionButton action={() => setSetting(settingKey, kind === "number" ? Number(v) : String(v))} size="sm">Salvar</ActionButton>
      )}
    </div>
  );
}

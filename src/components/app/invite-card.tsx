import { Check, X } from "lucide-react";
import { Avatar } from "@/components/shared/ui-bits";
import { ActionButton } from "@/components/shared/action-button";
import { respondInvite } from "@/lib/actions/teams";
import { formatRelative } from "@/lib/format";
import type { getMyInvites } from "@/lib/player";

export function InviteList({ invites }: { invites: Awaited<ReturnType<typeof getMyInvites>> }) {
  return (
    <ul className="grid gap-2">
      {invites.map((i) => (
        <li key={i.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
          <Avatar src={i.team.logo_url} name={i.team.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{i.team.name} <span className="text-muted-foreground">[{i.team.tag}]</span></p>
            <p className="text-xs text-muted-foreground">Convite de @{i.inviter?.username} · {formatRelative(i.created_at)}</p>
          </div>
          <div className="flex gap-2">
            <ActionButton action={respondInvite.bind(null, i.id, false)} variant="ghost" size="sm"><X /> Recusar</ActionButton>
            <ActionButton action={respondInvite.bind(null, i.id, true)} size="sm"><Check /> Aceitar</ActionButton>
          </div>
        </li>
      ))}
    </ul>
  );
}

"use client";
import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/types";

type Variant = "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";

/**
 * One-click server action with optional confirmation and required reason.
 * `action` is a bound server action; when `reason` is set the typed text is passed as the last argument.
 */
export function ActionButton({
  action, children, variant = "default", size = "default", className, confirm, reason, ariaLabel,
}: {
  action: (reason?: string) => Promise<ActionResult>;
  children: ReactNode;
  variant?: Variant;
  size?: "default" | "sm" | "lg" | "icon" | "icon-sm" | "xs";
  className?: string;
  confirm?: { title: string; description?: string; confirmLabel?: string; destructive?: boolean };
  reason?: { label: string; required?: boolean };
  ariaLabel?: string;
}) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const router = useRouter();

  const run = () =>
    start(async () => {
      const r = await action(reason ? text.trim() : undefined);
      if (r.ok) {
        if (r.message) toast.success(r.message);
        setOpen(false);
        setText("");
        if (r.redirectTo) router.push(r.redirectTo);
        else router.refresh();
      } else toast.error(r.message);
    });

  const button = (
    <Button
      variant={variant}
      size={size}
      className={className}
      disabled={pending}
      aria-label={ariaLabel}
      onClick={() => (confirm || reason ? setOpen(true) : run())}
    >
      {pending && <Loader2 className="animate-spin" aria-hidden />}
      {children}
    </Button>
  );
  if (!confirm && !reason) return button;

  return (
    <>
      {button}
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.title ?? "Confirmar ação"}</AlertDialogTitle>
            {confirm?.description && <AlertDialogDescription>{confirm.description}</AlertDialogDescription>}
          </AlertDialogHeader>
          {reason && (
            <div className="grid gap-1.5">
              <label htmlFor="action-reason" className="text-sm font-medium">{reason.label}</label>
              <Textarea id="action-reason" value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={500} />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              variant={confirm?.destructive ? "destructive" : "default"}
              disabled={pending || (reason?.required && text.trim().length < 3)}
              onClick={(e) => { e.preventDefault(); run(); }}
            >
              {pending && <Loader2 className="animate-spin" aria-hidden />}
              {confirm?.confirmLabel ?? "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

"use client";
import { createContext, useActionState, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/types";

type FormAction = (state: ActionResult | null, fd: FormData) => Promise<ActionResult>;
const ErrorsCtx = createContext<Record<string, string[] | undefined>>({});

/** Form bound to a server action: toasts the result, shows field errors, follows redirectTo. */
export function ActionForm({
  action, children, className, resetOnSuccess, onSuccess, onError, id, preventEnterSubmit,
}: {
  action: FormAction;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  onSuccess?: (r: ActionResult) => void;
  onError?: (fieldErrors: Record<string, string[] | undefined>) => void;
  id?: string;
  preventEnterSubmit?: boolean; // multi-step forms: Enter must not submit early
}) {
  const [state, formAction] = useActionState(action, null);
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      if (state.message) toast.success(state.message);
      if (resetOnSuccess) ref.current?.reset();
      onSuccess?.(state);
      if (state.redirectTo) router.push(state.redirectTo);
      else router.refresh();
    } else {
      toast.error(state.message);
      onError?.(state.fieldErrors ?? {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <ErrorsCtx.Provider value={state && !state.ok ? state.fieldErrors ?? {} : {}}>
      <form ref={ref} id={id} action={formAction} className={cn("grid gap-4", className)} noValidate
        onKeyDown={preventEnterSubmit ? (e) => { if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") e.preventDefault(); } : undefined}>
        {children}
      </form>
    </ErrorsCtx.Provider>
  );
}

export function SubmitButton({ children, className, variant, size, name, value }: {
  children: ReactNode; className?: string; variant?: "default" | "outline" | "secondary" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg"; name?: string; value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className={className} variant={variant} size={size} name={name} value={value} aria-busy={pending}>
      {pending && <Loader2 className="animate-spin" aria-hidden />}
      {children}
    </Button>
  );
}

export function FieldError({ name }: { name: string }) {
  const errors = useContext(ErrorsCtx)[name];
  if (!errors?.length) return null;
  return <p id={`${name}-error`} className="text-xs text-destructive" role="alert">{errors[0]}</p>;
}

type FieldProps = {
  name: string;
  label: string;
  hint?: string;
  textarea?: boolean;
  className?: string;
} & React.InputHTMLAttributes<HTMLInputElement> & React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Field({ name, label, hint, textarea, className, ...props }: FieldProps) {
  const errors = useContext(ErrorsCtx)[name];
  const [shown, setShown] = useState(false);
  const common = {
    id: name, name, "aria-invalid": errors?.length ? true : undefined,
    "aria-describedby": errors?.length ? `${name}-error` : hint ? `${name}-hint` : undefined,
  };
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={name}>{label}{props.required && <span className="text-primary-text"> *</span>}</Label>
      {textarea ? <Textarea {...common} {...props} /> : props.type === "password" ? (
        <div className="relative">
          <Input {...common} {...props} type={shown ? "text" : "password"} className="pr-12" />
          <button type="button" onClick={() => setShown((s) => !s)} aria-label={shown ? "Ocultar senha" : "Mostrar senha"} aria-pressed={shown}
            className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-xl text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
            {shown ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
          </button>
        </div>
      ) : <Input {...common} {...props} />}
      {hint && !errors?.length && <p id={`${name}-hint`} className="text-xs text-muted-foreground">{hint}</p>}
      <FieldError name={name} />
    </div>
  );
}

/** Native select styled like the inputs; works inside server-action forms without JS. */
export function SelectField({ name, label, options, defaultValue, hint, className, onChange }: {
  name: string; label: string; options: readonly { value: string; label: string }[]; defaultValue?: string;
  hint?: string; className?: string; onChange?: (v: string) => void;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={name}>{label}</Label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue}
        onChange={(e) => onChange?.(e.target.value)}
        className="h-11 w-full rounded-xl border border-input bg-background px-3.5 text-base md:text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {options.map((o) => <option key={o.value} value={o.value} className="bg-popover">{o.label}</option>)}
      </select>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <FieldError name={name} />
    </div>
  );
}

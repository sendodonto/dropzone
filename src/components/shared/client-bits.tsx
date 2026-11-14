"use client";
import { useEffect, useState } from "react";
import { Check, Copy, ImageUp, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-label={`Copiar ${label}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          toast.success(`${label} copiado!`);
          setTimeout(() => setDone(false), 1800);
        } catch {
          toast.error("Não foi possível copiar. Selecione o texto manualmente.");
        }
      }}
    >
      {done ? <Check className="text-success" /> : <Copy />}
      {done ? "Copiado" : "Copiar"}
    </Button>
  );
}

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

/** Live countdown; renders `done` once the target passes. */
export function Countdown({ to, done = "Agora", className }: { to: string; done?: string; className?: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0); // client-only clock: avoids SSR/hydration mismatch
    const t = setInterval(tick, 1000);
    return () => { clearTimeout(first); clearInterval(t); };
  }, []);
  if (now === null) return <span className={cn("tabular-nums", className)}>--:--</span>;
  const ms = new Date(to).getTime() - now;
  if (ms <= 0) return <span className={className}>{done}</span>;
  const { d, h, m, s } = parts(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <span className={cn("tabular-nums", className)} aria-live="off">
      {d > 0 && `${d}d `}{pad(h)}:{pad(m)}:{pad(s)}
    </span>
  );
}

/**
 * Uploads an image to a public bucket under "<uid>/..." and stores the public URL
 * in a hidden input named `name`, so it submits with the surrounding form.
 */
export function ImageUpload({ name, bucket, defaultValue, label, aspect = "square", onChange }: {
  name: string; bucket: "avatars" | "team-logos" | "tournament-media"; defaultValue?: string | null; label: string;
  aspect?: "square" | "wide"; onChange?: (url: string) => void;
}) {
  const [url, setUrlState] = useState(defaultValue ?? "");
  const setUrl = (u: string) => { setUrlState(u); onChange?.(u); };
  const [busy, setBusy] = useState(false);

  async function onFile(file: File) {
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) return toast.error("Use PNG, JPG ou WEBP.");
    const max = bucket === "tournament-media" ? 5 : 2;
    if (file.size > max * 1024 * 1024) return toast.error(`Imagem maior que ${max} MB.`);
    setBusy(true);
    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Faça login novamente.");
      const path = `${auth.user.id}/${crypto.randomUUID()}.${file.name.split(".").pop()?.toLowerCase() ?? "png"}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) throw error;
      setUrl(supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl);
      toast.success("Imagem enviada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <input type="hidden" name={name} value={url} />
      <div className="flex items-center gap-3">
        <label className={cn(
          "relative grid cursor-pointer place-items-center overflow-hidden rounded-lg border border-dashed bg-muted/40 text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground focus-within:ring-3 focus-within:ring-ring/50",
          aspect === "wide" ? "h-24 w-44" : "size-20",
        )}>
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="size-full object-cover" />
          ) : busy ? <Loader2 className="size-5 animate-spin" /> : <ImageUp className="size-5" />}
          <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={busy}
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} aria-label={label} />
        </label>
        {url && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setUrl("")}>
            <X /> Remover
          </Button>
        )}
      </div>
    </div>
  );
}

import { Database } from "lucide-react";
import { site } from "@/config/site";

/** Shown instead of the app when Supabase env vars are missing (fresh clone). */
export function SetupRequired() {
  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <div className="max-w-lg rounded-3xl bg-card p-6">
        <Database className="mb-3 size-6 text-primary-text" aria-hidden />
        <h1 className="font-heading text-2xl font-bold">{site.name}: configure o Supabase</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Defina as variáveis abaixo em <code className="rounded bg-muted px-1">.env.local</code> e reinicie o servidor.
          O passo a passo completo está no README.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-lg bg-muted p-3 text-xs">
{`NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000`}
        </pre>
      </div>
    </main>
  );
}

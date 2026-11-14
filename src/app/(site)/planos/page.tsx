import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/ui-bits";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Planos para organizadores" };

export default async function PlansPage() {
  const supabase = await createClient();
  const [{ data: plans }, { data: billing }] = await Promise.all([
    supabase.from("plans").select("*").order("sort_order"),
    supabase.from("platform_settings").select("value").eq("key", "subscriptions_billing_enabled").maybeSingle(),
  ]);
  const billingOn = billing?.value === true;
  return (
    <div className="mx-auto grid max-w-4xl gap-8 px-4 py-10 sm:px-6">
      <PageHeader title="Planos" description="Comece grátis. O plano Pro é para ligas e organizadores frequentes." />
      <div className="grid gap-4 md:grid-cols-2">
        {(plans ?? []).map((p: { id: string; code: string; name: string; description: string; price_cents: number; features: string[]; max_active_tournaments: number }) => (
          <div key={p.id} className={cn("flex flex-col rounded-2xl border bg-card p-6", p.code === "PRO" && "border-primary/50")}>
            <p className="font-heading text-2xl font-bold">{p.name}</p>
            <p className="text-sm text-muted-foreground">{p.description}</p>
            <p className="mt-4 font-heading text-4xl font-extrabold">{p.price_cents ? formatMoney(p.price_cents) : "Grátis"}<span className="text-base font-normal text-muted-foreground">{p.price_cents ? "/mês" : ""}</span></p>
            <ul className="mt-5 grid gap-2 text-sm">
              {p.features.map((f) => <li key={f} className="flex gap-2"><Check className="size-4 shrink-0 text-primary-text" aria-hidden />{f}</li>)}
            </ul>
            <div className="mt-6">
              {p.code === "FREE" ? (
                <Link href="/organizador/comecar" className={buttonVariants({ variant: "outline", className: "w-full" })}>Começar grátis</Link>
              ) : billingOn ? (
                <Link href="/organizador/perfil" className={buttonVariants({ className: "w-full" })}>Assinar</Link>
              ) : (
                <p className="rounded-lg bg-muted p-3 text-center text-sm text-muted-foreground">Assinaturas em breve. Fale com a equipe para acesso antecipado.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

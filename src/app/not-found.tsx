import Link from "next/link";
import { Compass } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";

export default function NotFound() {
  return (
    <main id="conteudo" className="grid min-h-dvh place-items-center px-4">
      <div className="text-center">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <Compass className="mx-auto size-10 text-primary-text" aria-hidden />
        <h1 className="mt-4 text-4xl">Fora da zona</h1>
        <p className="mt-2 text-muted-foreground">Esta página não existe ou você não tem acesso a ela.</p>
        <div className="mt-6 flex justify-center gap-2">
          <Link href="/" className={buttonVariants()}>Ir para o início</Link>
          <Link href="/campeonatos" className={buttonVariants({ variant: "outline" })}>Ver campeonatos</Link>
        </div>
      </div>
    </main>
  );
}

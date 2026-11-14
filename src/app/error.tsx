"use client";
import { useEffect } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <main id="conteudo" className="grid min-h-[60dvh] place-items-center px-4">
      <div className="max-w-md text-center">
        <TriangleAlert className="mx-auto size-10 text-destructive" aria-hidden />
        <h1 className="mt-4 font-heading text-2xl font-bold">Algo deu errado</h1>
        <p className="mt-2 text-sm text-muted-foreground">Não foi possível carregar esta página. Tente novamente em instantes.</p>
        {error.digest && <p className="mt-2 font-mono text-xs text-muted-foreground">Código: {error.digest}</p>}
        <Button className="mt-6" onClick={reset}><RotateCcw /> Tentar novamente</Button>
      </div>
    </main>
  );
}

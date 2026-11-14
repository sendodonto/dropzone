import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main id="conteudo" className="relative grid min-h-dvh place-items-center px-4 py-10">
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <div className="rounded-3xl bg-card p-6">{children}</div>
      </div>
    </main>
  );
}


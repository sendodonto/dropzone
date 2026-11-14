"use client";
import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

/** URL-synced search input (debounced). Reused by public and admin lists. */
export function SearchBox({ placeholder, defaultValue, param = "q" }: { placeholder: string; defaultValue?: string; param?: string }) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [pending, start] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if ((defaultValue ?? "") === value) return;
    const t = setTimeout(() => start(() => router.replace(value ? `${pathname}?${param}=${encodeURIComponent(value)}` : pathname)), 350);
    return () => clearTimeout(t);
  }, [value, defaultValue, pathname, param, router]);
  return (
    <div className="relative max-w-md">
      <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} className="pl-9" aria-label={placeholder} maxLength={60} />
      {pending && <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
    </div>
  );
}

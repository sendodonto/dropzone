import Link from "next/link";
import { site } from "@/config/site";
import { cn } from "@/lib/utils";

/** Wordmark: a drop marker + the product name from config. */
export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2 font-heading text-lg font-bold tracking-tight", className)} aria-label={`${site.name} — início`}>
      <svg viewBox="0 0 24 24" className="size-6 text-primary-text transition-transform group-hover:-translate-y-0.5" aria-hidden>
        <path d="M12 2 4 7v6c0 4.4 3.4 8.1 8 9 4.6-.9 8-4.6 8-9V7l-8-5Z" fill="currentColor" opacity=".18" />
        <path d="M12 2 4 7v6c0 4.4 3.4 8.1 8 9 4.6-.9 8-4.6 8-9V7l-8-5Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M12 7v7m0 0-3-3m3 3 3-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="uppercase">{site.name}</span>
    </Link>
  );
}

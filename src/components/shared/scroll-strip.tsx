"use client";
import { useEffect, useRef, type ReactNode } from "react";

/** Horizontal nav strip that keeps the current item (aria-current="page") scrolled into view on narrow screens. */
export function ScrollStrip({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = ref.current;
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !active) return;
    // Scroll the strip only (scrollIntoView would also move the page vertically).
    const n = nav.getBoundingClientRect(), a = active.getBoundingClientRect();
    nav.scrollLeft += a.left - n.left - (n.width - a.width) / 2;
  });
  return <nav ref={ref} aria-label={label} className={className}>{children}</nav>;
}

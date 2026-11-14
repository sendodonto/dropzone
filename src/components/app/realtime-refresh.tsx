"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Refreshes server data when rows change (Supabase Realtime; RLS still applies). */
export function RealtimeRefresh({ table, filter }: { table: "notifications" | "match_results" | "matches"; filter?: string }) {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    let t: ReturnType<typeof setTimeout>;
    const channel = supabase
      .channel(`rt-${table}-${filter ?? "all"}`)
      .on("postgres_changes", { event: "*", schema: "public", table, filter }, () => {
        clearTimeout(t);
        t = setTimeout(() => router.refresh(), 400); // debounce bursts (e.g. a full result sheet)
      })
      .subscribe();
    return () => {
      clearTimeout(t);
      supabase.removeChannel(channel);
    };
  }, [table, filter, router]);
  return null;
}

"use client";
import { createBrowserClient } from "@supabase/ssr";

// Browser client (anon key + user session). Used for uploads and realtime only;
// mutations go through server actions.
export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

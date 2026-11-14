import "server-only";
import { cache } from "react";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Organizer, Profile } from "@/lib/types";

export interface Viewer {
  id: string;
  email: string | null;
  profile: Profile;
  isAdmin: boolean;
  organizers: Organizer[];
}

/** Current user + profile + roles, deduplicated per request. Null when signed out. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const [{ data: profile }, { data: roles }, { data: memberships }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", auth.user.id).single(),
    supabase.from("user_roles").select("role").eq("user_id", auth.user.id),
    supabase.from("organizer_members").select("organizer:organizers(*)").eq("user_id", auth.user.id),
  ]);
  if (!profile) return null;
  return {
    id: auth.user.id,
    email: auth.user.email ?? null,
    profile: profile as Profile,
    isAdmin: (roles ?? []).some((r) => r.role === "admin"),
    organizers: (memberships ?? []).map((m) => m.organizer as unknown as Organizer).filter(Boolean),
  };
});

/** For authenticated pages: redirects to login / onboarding when needed. */
export async function requireViewer(opts: { allowIncompleteOnboarding?: boolean } = {}) {
  const viewer = await getViewer();
  if (!viewer) redirect("/entrar");
  if (!opts.allowIncompleteOnboarding && !viewer.profile.onboarded) redirect("/onboarding");
  return viewer;
}

export async function requireAdmin() {
  const viewer = await requireViewer();
  if (!viewer.isAdmin) notFound(); // do not reveal the admin area exists
  return viewer;
}

export async function requireOrganizer() {
  const viewer = await requireViewer();
  const org = viewer.organizers[0];
  if (!org) redirect("/organizador/comecar");
  return { viewer, org };
}

-- DROPZONE · 0010 · Function privileges.
-- Hosted Supabase grants EXECUTE on every new public function to anon and authenticated by default,
-- so functions created after 0004 were callable more widely than intended. Close that, and stop it
-- from happening again: every RPC is granted explicitly in its own migration.

alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;

-- Internal helpers: only called from other SECURITY DEFINER functions.
revoke execute on function public.notify_wager(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.wager_roster_check(uuid, uuid[], int) from public, anon, authenticated;
revoke execute on function public.assert_can_organize_tournament() from public, anon, authenticated;

-- Signed-in only (they all require a session anyway).
revoke execute on function
  public.configure_groups(uuid, int), public.set_registration_group(uuid, text), public.can_organize(uuid),
  public.confirm_adult(date), public.create_wager(int, int, int, text, text, uuid, uuid[]), public.accept_wager(uuid, uuid, uuid[]),
  public.cancel_wager(uuid), public.report_wager(uuid, text), public.admin_mark_wager_paid(uuid, text),
  public.set_wager_room(uuid, text, text), public.admin_resolve_wager(uuid, text, text), public.admin_mark_wager_payout(uuid),
  public.is_wager_participant(uuid)
from public, anon;

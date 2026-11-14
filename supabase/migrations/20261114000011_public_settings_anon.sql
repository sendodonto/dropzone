-- DROPZONE · 0011 · Visitors can read public settings.
-- 0004 revoked SELECT on platform_settings from anon, so logged-out pages saw every flag as unset
-- (apostados shown as paused, the global banner hidden). The RLS policy "settings: public keys" already
-- limits rows to is_public = true, so granting SELECT exposes only public keys.
grant select on public.platform_settings to anon;

-- DROPZONE · 0006 · Organizing gate.
-- While `organizing_open` is false, only official organizers (the platform's own) and admins can create
-- organizer profiles, create tournaments or publish them. Admins flip it in Configurações.

insert into public.platform_settings (key, value, is_public) values ('organizing_open', 'false', true)
on conflict (key) do nothing;

create or replace function public.organizing_open()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((public.setting('organizing_open'))::boolean, false);
$$;

create or replace function public.can_organize(p_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_admin() or public.organizing_open()
      or exists (select 1 from public.organizers where id = p_org and is_official);
$$;

-- New organizer profiles
create or replace function public.create_organizer(p_name text, p_description text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v uuid := public.assert_active(); oid uuid; needs_approval boolean;
begin
  if not (public.is_admin() or public.organizing_open()) then
    raise exception 'A criação de campeonatos está restrita à equipe da plataforma no momento.' using errcode = '42501';
  end if;
  if exists (select 1 from public.organizers where owner_id = v) then
    raise exception 'Você já possui um perfil de organizador.';
  end if;
  needs_approval := coalesce((public.setting('organizer_requires_approval'))::boolean, false);
  insert into public.organizers(slug, name, description, owner_id, status, plan_id)
  values (public.unique_slug('organizers', p_name), trim(p_name), p_description, v,
          case when needs_approval then 'pending' else 'approved' end::public.organizer_status,
          (select id from public.plans where code = 'FREE'))
  returning id into oid;
  insert into public.organizer_members(organizer_id, user_id, role) values (oid, v, 'owner');
  perform public.log_action('organizer.created', 'organizer', oid, null, jsonb_build_object('name', p_name));
  return oid;
end $$;

-- New tournaments (drafts included)
drop policy "tournaments: organizer creates" on public.tournaments;
create policy "tournaments: organizer creates" on public.tournaments for insert
  with check (public.can_manage_organizer(organizer_id) and public.can_organize(organizer_id));

-- Publishing: also blocks drafts created before the gate closed.
create or replace function public.assert_can_organize_tournament()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'registration_open' and old.status = 'draft' and not public.can_organize(new.organizer_id) then
    raise exception 'A criação de campeonatos está restrita à equipe da plataforma no momento.' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists tournaments_organizing_gate on public.tournaments;
create trigger tournaments_organizing_gate before update of status on public.tournaments
  for each row execute function public.assert_can_organize_tournament();

revoke execute on function public.assert_can_organize_tournament() from public, anon, authenticated;
grant execute on function public.organizing_open() to anon, authenticated;
grant execute on function public.can_organize(uuid) to authenticated;

-- DROPZONE · DEMO SEED
-- Everything here is FICTIONAL demo data (is_demo = true, names end in "(demo)").
-- It must never be loaded into production as if it were real competition data.
--
-- Demo logins (password for all: DropzoneDemo!2026)
--   organizador@demo.dropzone.gg  → owns "Arena Demo" (manages the live tournament)
--   oficial@demo.dropzone.gg      → owns "DROPZONE Oficial (demo)"
--   jogador@demo.dropzone.gg      → captain of "Demo Squad", not yet registered anywhere
--   playerNNN@demo.dropzone.gg    → filler players
-- No admin is seeded. Grant one with: npm run admin:grant -- <email>

select setseed(0.42);

create temporary table _names(n int, name text, tag text);
insert into _names values
 (1,'Lobos do Asfalto','LDA'),(2,'Bermuda Kings','BK'),(3,'Squad Fênix','FNX'),(4,'Tropa do Norte','TDN'),
 (5,'Zona Vermelha','ZV'),(6,'Ataque Relâmpago','ATR'),(7,'Corvos Noturnos','CRV'),(8,'Purgatório Team','PGT'),
 (9,'Os Imparáveis','IMP'),(10,'Kalahari Rush','KLH'),(11,'Neon Snipers','NEON'),(12,'Muralha Sul','MSUL'),
 (13,'Pandas Táticos','PND'),(14,'Gelo Seco','GLS'),(15,'Último Círculo','ULC'),(16,'Vanguarda','VNG'),
 (17,'Alcateia','ALC'),(18,'Família Booyah','FBY'),(19,'Capuchinhos','CAP'),(20,'Tubarões FF','TUB'),
 (21,'Hidra','HDR'),(22,'Eclipse Squad','ECL'),(23,'Sentinelas','SNT'),(24,'Bala Perdida','BLP'),
 (25,'Cometas','CMT'),(26,'Ninho da Águia','NDA'),(27,'Raio Verde','RVD'),(28,'Fuzileiros','FZL');

do $$
declare
  pw text := extensions.crypt('DropzoneDemo!2026', extensions.gen_salt('bf'));
  uid uuid; i int; tm uuid;
  org_official uuid; org_arena uuid; org_owner uuid; official_owner uuid; demo_player uuid; season uuid;
  t_final uuid; t_old uuid; t_live uuid; t_open uuid; t_sponsored uuid; t_duo uuid;
begin
  -- ── users ────────────────────────────────────────────────
  create temporary table _u(email text, username text, display text, id uuid default gen_random_uuid());
  insert into _u(email, username, display) values
    ('organizador@demo.dropzone.gg', 'arena_demo', 'Arena Demo (staff)'),
    ('oficial@demo.dropzone.gg', 'dropzone_oficial', 'Equipe DROPZONE (demo)'),
    ('jogador@demo.dropzone.gg', 'jogador_demo', 'Jogador Demo');
  insert into _u(email, username, display)
    select format('player%s@demo.dropzone.gg', lpad(g::text, 3, '0')), format('demo_p%s', lpad(g::text, 3, '0')),
           (array['Kaio','Duda','Rafa','Leo','Bia','Theo','Gabi','Nico','Lari','Juca','Mel','Davi','Iris','Caio','Nina'])[1 + g % 15]
           || ' ' || (array['Sniper','Rush','Ghost','Tank','Flash','Ace','Wolf','Viper'])[1 + g % 8] || ' ' || g
    from generate_series(1, 120) g;

  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change)
  select '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', email, pw, now(),
    '{"provider":"email","providers":["email"]}', jsonb_build_object('username', username, 'display_name', display),
    now() - interval '90 days', now(), '', '', '', ''
  from _u;
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  select gen_random_uuid(), id, id::text, jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true),
    'email', now(), now(), now() from _u;

  update public.profiles p set is_demo = true, onboarded = true, region = 'BR',
    preferred_mode = 'squad', ff_id = (100000000 + (random() * 899999999)::int)::text,
    intent = case when u.username in ('arena_demo', 'dropzone_oficial') then 'organize' else 'play' end::public.user_intent
  from _u u where u.id = p.id;

  select id into org_owner from _u where username = 'arena_demo';
  select id into official_owner from _u where username = 'dropzone_oficial';
  select id into demo_player from _u where username = 'jogador_demo';

  -- ── organizers, season ───────────────────────────────────
  insert into public.organizers(slug, name, description, owner_id, is_official, is_demo, plan_id)
  values ('dropzone-oficial-demo', 'DROPZONE Oficial (demo)', 'Campeonatos oficiais da comunidade — exemplo de demonstração.',
          official_owner, true, true, (select id from public.plans where code = 'PRO'))
  returning id into org_official;
  insert into public.organizers(slug, name, description, owner_id, is_demo, plan_id)
  values ('arena-demo', 'Arena Demo', 'Organizador fictício usado para demonstrar a plataforma.',
          org_owner, true, (select id from public.plans where code = 'FREE'))
  returning id into org_arena;
  insert into public.organizer_members values (org_official, official_owner, 'owner', now()), (org_arena, org_owner, 'owner', now());

  insert into public.seasons(slug, name, starts_at, ends_at, rewards_description, is_demo)
  values ('temporada-1-demo', 'Temporada 1 (demo)', current_date - 120, current_date + 60,
          'Distintivo de campeão de temporada (demonstração).', true)
  returning id into season;

  -- ── teams: 28 squads of 4 (+1 reserve on even teams) ─────
  for i in 1..28 loop
    insert into public.teams(slug, name, tag, description, captain_id, is_demo)
    select public.slugify(n.name) || '-demo', n.name || ' (demo)', n.tag, 'Squad fictício de demonstração.',
           (select id from _u where username = format('demo_p%s', lpad(((i - 1) * 4 + 1)::text, 3, '0'))), true
    from _names n where n.n = i returning id into tm;
    insert into public.team_members(team_id, user_id, role)
    select tm, u.id, case when g = 1 then 'captain' else 'player' end::public.team_role
    from generate_series(1, 4) g join _u u on u.username = format('demo_p%s', lpad(((i - 1) * 4 + g)::text, 3, '0'));
    insert into public.team_member_events(team_id, user_id, actor_id, action)
    select tm, captain_id, captain_id, 'created' from public.teams where id = tm;
  end loop;
  -- reserves: players 113-120 join teams 1..8 as 5th member
  insert into public.team_members(team_id, user_id)
  select t.id, u.id from generate_series(1, 8) g
  join public.teams t on t.slug = (select public.slugify(name) || '-demo' from _names where n = g)
  join _u u on u.username = format('demo_p%s', lpad((112 + g)::text, 3, '0'));

  -- demo player's own squad (unregistered, ready to test inscrição)
  insert into public.teams(slug, name, tag, description, captain_id, is_demo)
  values ('demo-squad', 'Demo Squad', 'DEMO', 'Seu squad de teste. Inscreva-o na Liga Noturna Demo.', demo_player, true)
  returning id into tm;
  insert into public.team_members(team_id, user_id, role) values (tm, demo_player, 'captain');
  insert into public.team_members(team_id, user_id)
  select tm, id from _u where username in ('demo_p113', 'demo_p114', 'demo_p115');
  -- pending invite for the demo player
  insert into public.team_invites(team_id, invited_user_id, invited_by)
  select id, demo_player, captain_id from public.teams where slug = 'lobos-do-asfalto-demo';

  -- ── tournaments ──────────────────────────────────────────
  insert into public.tournaments(organizer_id, season_id, name, description, mode, region, starts_at, registration_opens_at,
    registration_closes_at, matches_count, max_teams, entry_type, prize_pool_cents, prize_description, status, published_at,
    finished_at, featured, is_demo)
  values (org_official, season, 'Copa DROPZONE Demo — Final da Temporada',
    'Campeonato fictício completo: 24 squads e 4 quedas, para demonstrar classificação e rankings.',
    'squad', 'BR', now() - interval '6 days', now() - interval '20 days', now() - interval '7 days', 4, 24, 'sponsored', 0,
    'Premiação ilustrativa (demonstração) — nenhum valor real.', 'finished', now() - interval '20 days', now() - interval '6 days',
    true, true) returning id into t_final;

  insert into public.tournaments(organizer_id, season_id, name, description, mode, region, starts_at, matches_count, max_teams,
    entry_type, status, published_at, finished_at, is_demo)
  values (org_arena, season, 'Liga Arena Demo #7', 'Edição anterior fictícia da liga semanal.', 'squad', 'BR',
    now() - interval '40 days', 3, 12, 'free', 'finished', now() - interval '50 days', now() - interval '40 days', true)
  returning id into t_old;

  insert into public.tournaments(organizer_id, name, description, mode, region, starts_at, matches_count, max_teams,
    entry_type, status, published_at, dispute_window_minutes, is_demo)
  values (org_arena, 'Desafio Relâmpago Demo', 'Campeonato fictício em andamento: 2 de 4 quedas publicadas.', 'squad', 'BR',
    now() - interval '1 hour', 4, 12, 'free', 'live', now() - interval '3 days', 60, true)
  returning id into t_live;

  insert into public.tournaments(organizer_id, season_id, name, description, mode, region, starts_at, registration_opens_at,
    registration_closes_at, matches_count, max_teams, entry_type, prize_description, status, published_at, featured, is_demo)
  values (org_arena, season, 'Liga Noturna Demo #12', 'Liga semanal fictícia, gratuita. Inscrições abertas para teste.',
    'squad', 'BR', now() + interval '3 days', now() - interval '2 days', now() + interval '2 days', 4, 24, 'free',
    'Medalhas e destaque no ranking (demonstração).', 'registration_open', now() - interval '2 days', true, true)
  returning id into t_open;

  insert into public.tournaments(organizer_id, name, description, mode, region, starts_at, registration_closes_at, matches_count,
    max_teams, entry_type, requires_approval, prize_pool_cents, prize_description, status, published_at, is_demo)
  values (org_official, 'Copa Patrocinada Demo', 'Exemplo de campeonato patrocinado com aprovação manual de inscrições.',
    'squad', 'BR', now() + interval '6 days', now() + interval '5 days', 5, 16, 'sponsored', true, 50000,
    'Premiação ilustrativa oferecida por patrocinador fictício.', 'registration_open', now() - interval '1 day', true)
  returning id into t_sponsored;

  insert into public.tournaments(organizer_id, name, description, mode, region, starts_at, matches_count, max_teams, team_size,
    reserves_allowed, entry_type, status, published_at, is_demo)
  values (org_arena, 'Copa Duo Demo', 'Formato duo fictício.', 'duo', 'BR', now() + interval '9 days', 3, 30, 2, 0, 'free',
    'registration_open', now(), true)
  returning id into t_duo;

  update public.tournament_rules set content = E'## Regulamento (demonstração)\n\n1. Squads de 4 jogadores, 1 reserva opcional.\n2. Proibido uso de emulador sem autorização.\n3. Check-in 15 minutos antes da queda.\n4. Contestação até o prazo exibido após cada queda.\n5. Pontuação: 12/9/8/7/6/5/4/3/2/1 + 1 ponto por eliminação.\n'
  where tournament_id in (t_final, t_old, t_live, t_open, t_sponsored, t_duo);
  insert into public.tournament_prizes(tournament_id, position, label, description) values
    (t_final, 1, '1º lugar', 'Troféu digital + destaque (demo)'), (t_final, 2, '2º lugar', 'Destaque (demo)'),
    (t_final, 3, '3º lugar', 'Destaque (demo)');
  insert into public.tournament_prizes(tournament_id, position, label, amount_cents, description) values
    (t_sponsored, 1, '1º lugar', 30000, 'Valor ilustrativo — demonstração'),
    (t_sponsored, 2, '2º lugar', 15000, 'Valor ilustrativo — demonstração'),
    (t_sponsored, 3, '3º lugar', 5000, 'Valor ilustrativo — demonstração');
  insert into public.sponsors(name, url, tournament_id) values ('Patrocinador Fictício (demo)', null, t_sponsored);

  -- ── registrations ───────────────────────────────────────
  create temporary table _reg(tournament uuid, team_n int, status public.registration_status);
  insert into _reg select t_final, g, 'confirmed'::public.registration_status from generate_series(1, 24) g;
  insert into _reg select t_old, g, 'confirmed'::public.registration_status from generate_series(5, 16) g;
  insert into _reg select t_live, g, 'confirmed'::public.registration_status from generate_series(1, 12) g;
  insert into _reg select t_open, g, 'confirmed'::public.registration_status from generate_series(13, 21) g;
  insert into _reg select t_sponsored, g, (case when g <= 23 then 'pending' else 'confirmed' end)::public.registration_status from generate_series(22, 26) g;

  insert into public.tournament_registrations(tournament_id, team_id, status, registered_by, created_at)
  select r.tournament, t.id, r.status, t.captain_id, now() - interval '10 days'
  from _reg r join _names n on n.n = r.team_n join public.teams t on t.slug = public.slugify(n.name) || '-demo';

  insert into public.registration_players(registration_id, tournament_id, user_id, is_reserve)
  select r.id, r.tournament_id, m.user_id, false
  from public.tournament_registrations r join public.team_members m on m.team_id = r.team_id;
  -- The 5th member of teams 1-8 (players 113-120) is the reserve.
  update public.registration_players rp set is_reserve = true
  from _u u where u.id = rp.user_id and u.username between 'demo_p113' and 'demo_p120';

  -- ── matches & results ───────────────────────────────────
  insert into public.matches(tournament_id, number, map, scheduled_at, status, results_status, results_published_at, dispute_deadline)
  select t.id, g, (array['Bermuda','Purgatório','Kalahari','Alpine','Nova Terra'])[1 + (g - 1) % 5],
    t.starts_at + (g - 1) * interval '25 minutes',
    case when t.status = 'finished' or (t.id = t_live and g <= 2) then 'finished' else 'scheduled' end::public.match_status,
    case when t.status = 'finished' or (t.id = t_live and g <= 2) then 'published' else 'none' end::public.results_status,
    case when t.status = 'finished' or (t.id = t_live and g <= 2) then t.starts_at + g * interval '25 minutes' end,
    case when t.status = 'finished' or (t.id = t_live and g <= 2) then t.starts_at + g * interval '25 minutes' + interval '1 hour' end
  from public.tournaments t cross join generate_series(1, 20) g
  where t.is_demo and t.status <> 'draft' and g <= t.matches_count;

  -- Random but repeatable placements; better placements tend to have more kills.
  insert into public.match_results(match_id, registration_id, placement, kills)
  select m.id, x.reg_id, x.placement, greatest(0, (random() * 6 + (13 - least(x.placement, 12)) * 0.5)::int)
  from public.matches m
  cross join lateral (
    select r.id as reg_id, row_number() over (order by random()) as placement
    from public.tournament_registrations r where r.tournament_id = m.tournament_id and r.status = 'confirmed'
  ) x
  where m.results_status = 'published' and m.tournament_id in (t_final, t_old, t_live);

  -- Split each squad's kills across its starters (feeds player rankings).
  insert into public.match_player_stats(match_result_id, user_id, kills)
  select mr.id, rp.user_id,
    (mr.kills / 4) + case when row_number() over (partition by mr.id order by rp.user_id) <= mr.kills % 4 then 1 else 0 end
  from public.match_results mr join public.registration_players rp on rp.registration_id = mr.registration_id and not rp.is_reserve;

  -- Finalize the finished tournaments the same way finalize_tournament() does.
  update public.tournament_registrations r set final_rank = s.rank
  from public.get_tournament_standings(t_final) s where s.registration_id = r.id;
  update public.tournament_registrations r set final_rank = s.rank
  from public.get_tournament_standings(t_old) s where s.registration_id = r.id;
  perform public.award_tournament_achievements(t_final);
  perform public.award_tournament_achievements(t_old);

  -- ── live tournament: room for match 3 published, match 4 pending ──
  insert into public.match_rooms(match_id, room_code, room_password, instructions, audience, opens_at, published, published_at)
  select id, '7741' || number || '09', 'dz' || number || 'demo', 'Entrem pelo modo Sala Personalizada. Respeitem o check-in.',
    'confirmed', now() - interval '5 minutes', number = 3, case when number = 3 then now() end
  from public.matches where tournament_id = t_live and number in (3, 4);

  insert into public.announcements(tournament_id, author_id, title, body, pinned) values
    (t_live, org_owner, 'Sala da queda 3 liberada (demo)', 'ID e senha disponíveis na aba Partidas para equipes confirmadas.', true),
    (t_open, org_owner, 'Check-in obrigatório (demo)', 'Façam check-in 15 minutos antes da primeira queda.', false);

  delete from public.audit_logs; -- seed inserts would otherwise show up as "result corrections"
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, tournament_id, data)
  values (null, 'seed.demo_loaded', 'system', null, null, '{"note":"Dados fictícios de demonstração"}');
  -- Seed-generated notifications are noise for a fresh demo; keep a welcome note only.
  delete from public.notifications;
  insert into public.notifications(user_id, type, title, body, link)
  values (demo_player, 'invite', 'Convite para squad', 'Lobos do Asfalto (demo) convidou você.', '/painel/squads');
end $$;

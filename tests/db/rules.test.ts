import { beforeAll, describe, expect, it } from "vitest";
import { as, createTestDb, failsAs, userId, type Db } from "./harness";
import { computeStandings, DEFAULT_SCORING } from "@/lib/scoring";

let db: Db;
let ids: Record<string, string> = {};
const tid = async (namePart: string) =>
  (await db.query<{ id: string }>("select id from tournaments where name like $1", [`%${namePart}%`])).rows[0].id;
const teamId = async (slug: string) => (await db.query<{ id: string }>("select id from teams where slug = $1", [slug])).rows[0].id;
const roster = async (team: string) =>
  (await db.query<{ user_id: string }>("select user_id from team_members where team_id = $1 order by role, joined_at", [team])).rows.map((r) => r.user_id);

beforeAll(async () => {
  db = await createTestDb();
  ids = {
    org: await userId(db, "arena_demo"),
    player: await userId(db, "jogador_demo"),
    p001: await userId(db, "demo_p001"),
    p049: await userId(db, "demo_p049"), // captain of team 13 (registered in Liga Noturna)
    stranger: await userId(db, "demo_p100"),
    open: await tid("Liga Noturna"),
    live: await tid("Relâmpago"),
    final: await tid("Final da Temporada"),
    demoSquad: await teamId("demo-squad"),
  };
  // Most rules below describe an open platform; the organizing gate has its own suite.
  await db.query("update platform_settings set value = 'true' where key = 'organizing_open'");
});

describe("entry fee paid to the organizer (external)", () => {
  it("needs a fee, payment instructions and manual approval; publishes and registers as pending", async () => {
    const official = (await db.query<{ id: string }>("select id from organizers where is_official limit 1")).rows[0].id;
    const owner = await userId(db, "dropzone_oficial");
    const insert = "insert into tournaments(organizer_id, name, starts_at, entry_type, entry_fee_cents, requires_approval, payment_instructions) values ($1, $2, now() + interval '3 days', 'external', $3, $4, $5) returning id";
    expect(await failsAs(db, owner, insert, [official, "Sem aprovação", 3000, false, "Pix chave X"])).toMatch(/external_fee_check/);
    expect(await failsAs(db, owner, insert, [official, "Sem instruções", 3000, true, null])).toMatch(/external_fee_check/);
    await as(db, owner, async (q) => {
      const id = (await q<{ id: string }>(insert, [official, "Copa Pix", 3000, true, "Pix chave X"])).rows[0].id;
      await q("select public.publish_tournament($1)", [id]);
      const st = await q<{ status: string }>("select status from tournaments where id = $1", [id]);
      expect(st.rows[0].status).toBe("registration_open");
    }, { keep: true });
    const id = (await db.query<{ id: string }>("select id from tournaments where name = 'Copa Pix'")).rows[0].id;
    const players = (await roster(ids.demoSquad)).slice(0, 4);
    await as(db, ids.player, async (q) => {
      const rid = (await q<{ register_team: string }>("select public.register_team($1, $2, $3::uuid[])", [id, ids.demoSquad, players])).rows[0].register_team;
      const r = await q<{ status: string }>("select status from tournament_registrations where id = $1", [rid]);
      expect(r.rows[0].status).toBe("pending");
    });
    await db.query("delete from tournaments where id = $1", [id]);
  });
});

describe("groups", () => {
  it("draw splits confirmed teams evenly, one match per round and group; results and rooms stay inside the group", async () => {
    await as(db, ids.org, async (q) => {
      await q("select public.configure_groups($1, 2)", [ids.open]);
      const sizes = await q<{ group_label: string; n: number }>("select group_label, count(*)::int n from tournament_registrations where tournament_id = $1 and status = 'confirmed' group by 1 order by 1", [ids.open]);
      expect(sizes.rows.map((r) => r.group_label)).toEqual(["A", "B"]);
      expect(Math.abs(sizes.rows[0].n - sizes.rows[1].n)).toBeLessThanOrEqual(1);
      const t = await q<{ matches_count: number }>("select matches_count from tournaments where id = $1", [ids.open]);
      const m = await q<{ n: number; rounds: number }>("select count(*)::int n, count(distinct round)::int rounds from matches where tournament_id = $1", [ids.open]);
      expect(m.rows[0]).toEqual({ n: t.rows[0].matches_count * 2, rounds: t.rows[0].matches_count });

    }, { keep: true });
    await db.query("update tournaments set status = 'live' where id = $1", [ids.open]);
    const matchA = (await db.query<{ id: string }>("select id from matches where tournament_id = $1 and group_label = 'A' and round = 1", [ids.open])).rows[0].id;
    const regB = (await db.query<{ id: string }>("select id from tournament_registrations where tournament_id = $1 and group_label = 'B' limit 1", [ids.open])).rows[0].id;
    const regA = (await db.query<{ id: string }>("select id from tournament_registrations where tournament_id = $1 and group_label = 'A' limit 1", [ids.open])).rows[0].id;
    expect(await failsAs(db, ids.org, "select public.save_match_results($1, $2::jsonb)", [matchA, JSON.stringify([{ registration_id: regB, placement: 1, kills: 0 }])]))
      .toMatch(/outro grupo/);
    await as(db, ids.org, (q) => q("select public.save_match_results($1, $2::jsonb)", [matchA, JSON.stringify([{ registration_id: regA, placement: 1, kills: 3 }])]));

    // rooms: published group-A room is visible to a group-A captain, not to a group-B captain
    await db.query("insert into match_rooms(match_id, room_code, published) values ($1, '999', true)", [matchA]);
    const captainOf = async (reg: string) => (await db.query<{ captain_id: string }>("select t.captain_id from tournament_registrations r join teams t on t.id = r.team_id where r.id = $1", [reg])).rows[0].captain_id;
    const seeA = await as(db, await captainOf(regA), (q) => q<{ v: boolean }>("select public.can_view_room($1) v", [matchA]));
    const seeB = await as(db, await captainOf(regB), (q) => q<{ v: boolean }>("select public.can_view_room($1) v", [matchA]));
    expect(seeA.rows[0].v).toBe(true);
    expect(seeB.rows[0].v).toBe(false);

    // restore the open tournament for the suites below
    await db.query("delete from match_results where match_id in (select id from matches where tournament_id = $1)", [ids.open]);
    await db.query("update tournaments set status = 'registration_open' where id = $1", [ids.open]);
    await as(db, ids.org, (q) => q("select public.configure_groups($1, 1)", [ids.open]), { keep: true });
  });
});

describe("organizing gate (organizing_open = false)", () => {
  it("only official organizers and admins can create organizers or tournaments", async () => {
    await db.query("update platform_settings set value = 'false' where key = 'organizing_open'");
    try {
      const arena = (await db.query<{ id: string }>("select id from organizers where slug = 'arena-demo'")).rows[0].id;
      const official = (await db.query<{ id: string }>("select id from organizers where is_official limit 1")).rows[0].id;
      const officialOwner = await userId(db, "dropzone_oficial");
      expect(await failsAs(db, ids.player, "select public.create_organizer('Liga Nova')")).toMatch(/restrita/);
      expect(await failsAs(db, ids.org, "insert into tournaments(organizer_id, name, starts_at) values ($1, 'Bloqueado', now() + interval '2 days')", [arena]))
        .toMatch(/row-level security/);
      await as(db, officialOwner, async (q) => {
        const r = await q<{ status: string }>("insert into tournaments(organizer_id, name, starts_at) values ($1, 'Copa Oficial', now() + interval '2 days') returning status", [official]);
        expect(r.rows[0].status).toBe("draft");
      });
      // A draft created while the gate was open cannot be published after it closes.
      const draft = (await db.query<{ id: string }>("insert into tournaments(organizer_id, name, starts_at) values ($1, 'Rascunho Antigo', now() + interval '2 days') returning id", [arena])).rows[0].id;
      await expect(db.query("update tournaments set status = 'registration_open' where id = $1", [draft])).rejects.toThrow(/restrita/);
      await db.query("delete from tournaments where id = $1", [draft]);
    } finally {
      await db.query("update platform_settings set value = 'true' where key = 'organizing_open'");
    }
  });
});

describe("accounts & privilege escalation", () => {
  it("signup trigger creates a profile from metadata", async () => {
    await db.query(`insert into auth.users(id, email, raw_user_meta_data) values (gen_random_uuid(), 'new@test.dev', '{"username":"novo_user","display_name":"Novo"}')`);
    const r = await db.query<{ username: string; onboarded: boolean }>("select username, onboarded from profiles where username = 'novo_user'");
    expect(r.rows[0]).toEqual({ username: "novo_user", onboarded: false });
  });

  it("a user cannot make themselves admin", async () => {
    const msg = await failsAs(db, ids.player, "insert into user_roles(user_id, role) values ($1, 'admin')", [ids.player]);
    expect(msg).toMatch(/permission denied|row-level security/);
  });

  it("a user cannot lift their own suspension or edit status", async () => {
    const msg = await failsAs(db, ids.player, "update profiles set status = 'active' where id = $1", [ids.player]);
    expect(msg).toMatch(/permission denied/);
  });

  it("a user cannot edit someone else's profile", async () => {
    const n = await as(db, ids.player, (q) => q("update profiles set display_name = 'hack' where id = $1", [ids.org]));
    expect(n.affectedRows).toBe(0);
  });

  it("admin RPCs and bootstrap are closed to regular users", async () => {
    expect(await failsAs(db, ids.player, "select admin_set_user_status($1, 'banned', 'x')", [ids.org])).toMatch(/administrador/);
    expect(await failsAs(db, ids.player, "select bootstrap_admin('jogador@demo.dropzone.gg')")).toMatch(/permission denied/);
  });

  it("suspended users cannot act", async () => {
    await db.query("update profiles set status = 'suspended' where id = $1", [ids.stranger]);
    expect(await failsAs(db, ids.stranger, "select create_team('Teste', 'TST', null)")).toMatch(/suspensa/);
    await db.query("update profiles set status = 'active' where id = $1", [ids.stranger]);
  });
});

describe("squads", () => {
  it("captain invites by username; invitee accepts; non-captain cannot invite", async () => {
    await as(db, ids.player, async (q) => {
      const inv = await q<{ invite_to_team: string }>("select invite_to_team($1, 'demo_p100')", [ids.demoSquad]);
      await q(`select set_config('request.jwt.claim.sub', $1, true)`, [ids.stranger]);
      await q("select respond_team_invite($1, true)", [inv.rows[0].invite_to_team]);
      const m = await q("select 1 from team_members where team_id = $1 and user_id = $2", [ids.demoSquad, ids.stranger]);
      expect(m.rows).toHaveLength(1);
    });
    expect(await failsAs(db, ids.stranger, "select invite_to_team($1, 'demo_p099')", [ids.demoSquad])).toMatch(/capitão/);
  });

  it("captain cannot leave without transferring leadership", async () => {
    expect(await failsAs(db, ids.player, "select leave_team($1)", [ids.demoSquad])).toMatch(/Transfira/);
  });
});

describe("registrations", () => {
  const REGISTER = "select register_team($1, $2, $3::uuid[], $4::uuid[], null)";

  it("captain registers squad; duplicate registration is rejected", async () => {
    const players = await roster(ids.demoSquad);
    await as(db, ids.player, async (q) => {
      await q(REGISTER, [ids.open, ids.demoSquad, players, []]);
      const r = await q<{ status: string }>("select status from tournament_registrations where team_id = $1 and tournament_id = $2", [ids.demoSquad, ids.open]);
      expect(r.rows[0].status).toBe("confirmed");
      await expect(q(REGISTER, [ids.open, ids.demoSquad, players, []])).rejects.toThrow(/já está inscrito/);
    });
  });

  it("a player cannot play for two squads in the same tournament", async () => {
    // demo_p049's team 13 is already registered; put a team-13 player into demo squad's roster attempt.
    const team13 = (await db.query<{ team_id: string }>("select team_id from team_members where user_id = $1", [ids.p049])).rows[0].team_id;
    const stolen = (await roster(team13))[1];
    await db.query("insert into team_members(team_id, user_id) values ($1, $2)", [ids.demoSquad, stolen]);
    const players = (await roster(ids.demoSquad)).filter((u) => u !== stolen).slice(0, 3).concat(stolen);
    const msg = await failsAs(db, ids.player, REGISTER, [ids.open, ids.demoSquad, players, []]);
    expect(msg).toMatch(/já está inscrito neste campeonato por outro squad/);
    await db.query("delete from team_members where team_id = $1 and user_id = $2", [ids.demoSquad, stolen]);
  });

  it("only the captain can register, with the exact roster size, while registrations are open", async () => {
    const players = await roster(ids.demoSquad);
    expect(await failsAs(db, players[1], REGISTER, [ids.open, ids.demoSquad, players, []])).toMatch(/capitão/);
    expect(await failsAs(db, ids.player, REGISTER, [ids.open, ids.demoSquad, players.slice(0, 3), []])).toMatch(/exatamente 4/);
    expect(await failsAs(db, ids.player, REGISTER, [ids.live, ids.demoSquad, players, []])).toMatch(/não estão abertas/);
  });

  it("registrations cannot be inserted directly, bypassing the rules", async () => {
    const msg = await failsAs(db, ids.player, "insert into tournament_registrations(tournament_id, team_id, registered_by, status) values ($1, $2, $3, 'confirmed')",
      [ids.open, ids.demoSquad, ids.player]);
    expect(msg).toMatch(/permission denied/);
  });
});

describe("tournaments & organizer permissions", () => {
  it("organizers cannot set status/flags directly; new tournaments start as draft", async () => {
    const org = (await db.query<{ id: string }>("select id from organizers where slug = 'arena-demo'")).rows[0].id;
    expect(await failsAs(db, ids.org, "insert into tournaments(organizer_id, name, starts_at, status) values ($1, 'X Cup', now() + interval '2 days', 'live')", [org]))
      .toMatch(/permission denied/);
    await as(db, ids.org, async (q) => {
      const r = await q<{ status: string; slug: string }>("insert into tournaments(organizer_id, name, starts_at) values ($1, 'Copa Teste Ação', now() + interval '2 days') returning status, slug", [org]);
      expect(r.rows[0]).toEqual({ status: "draft", slug: "copa-teste-acao" });
    });
  });

  it("a user cannot create tournaments for an organizer they do not belong to", async () => {
    const org = (await db.query<{ id: string }>("select id from organizers where slug = 'arena-demo'")).rows[0].id;
    expect(await failsAs(db, ids.player, "insert into tournaments(organizer_id, name, starts_at) values ($1, 'Fake', now() + interval '2 days')", [org]))
      .toMatch(/row-level security/);
  });

  it("drafts are invisible to the public", async () => {
    await db.query("update tournaments set status = 'draft' where id = $1", [ids.open]);
    const r = await as(db, null, (q) => q("select id from tournaments where id = $1", [ids.open]));
    expect(r.rows).toHaveLength(0);
    await db.query("update tournaments set status = 'registration_open' where id = $1", [ids.open]);
  });

  it("players cannot write results; organizers can only while live", async () => {
    const match = (await db.query<{ id: string }>("select id from matches where tournament_id = $1 and number = 3", [ids.live])).rows[0].id;
    const reg = (await db.query<{ id: string }>("select id from tournament_registrations where tournament_id = $1 limit 1", [ids.live])).rows[0].id;
    expect(await failsAs(db, ids.p001, "insert into match_results(match_id, registration_id, placement, kills) values ($1, $2, 1, 5)", [match, reg]))
      .toMatch(/row-level security|permission denied/);
    await as(db, ids.org, async (q) => {
      await q("insert into match_results(match_id, registration_id, placement, kills) values ($1, $2, 1, 5)", [match, reg]);
      const r = await q<{ total_points: string }>("select total_points from match_results where match_id = $1 and registration_id = $2", [match, reg]);
      expect(Number(r.rows[0].total_points)).toBe(17); // 12 placement + 5 kills
    });
    const finishedMatch = (await db.query<{ id: string }>("select id from matches where tournament_id = $1 and number = 1", [ids.final])).rows[0].id;
    const n = await as(db, ids.org, (q) => q("update match_results set kills = 99 where match_id = $1", [finishedMatch]));
    expect(n.affectedRows).toBe(0);
  });

  it("client-supplied points are ignored (always recomputed)", async () => {
    const msg = await failsAs(db, ids.org, "update match_results set total_points = 999");
    expect(msg).toMatch(/permission denied/);
  });
});

describe("room credentials", () => {
  const roomQuery = "select room_code, room_password from match_rooms mr join matches m on m.id = mr.match_id where m.tournament_id = $1 order by m.number";

  it("confirmed participants see only published rooms", async () => {
    const r = await as(db, ids.p001, (q) => q<{ room_code: string }>(roomQuery, [ids.live])); // p001 = team 1 captain, confirmed
    expect(r.rows).toHaveLength(1); // match 3 published, match 4 not
  });

  it("non-participants and anonymous visitors see nothing", async () => {
    expect((await as(db, ids.player, (q) => q(roomQuery, [ids.live]))).rows).toHaveLength(0);
    expect(await failsAs(db, null, roomQuery, [ids.live])).toMatch(/permission denied/);
  });

  it("credentials stay hidden until opens_at", async () => {
    await db.query("update match_rooms set opens_at = now() + interval '1 hour' where room_code like '77413%'");
    expect((await as(db, ids.p001, (q) => q(roomQuery, [ids.live]))).rows).toHaveLength(0);
    await db.query("update match_rooms set opens_at = now() - interval '1 minute' where room_code like '77413%'");
  });

  it("the organizer sees every room", async () => {
    expect((await as(db, ids.org, (q) => q(roomQuery, [ids.live]))).rows).toHaveLength(2);
  });
});

describe("scoring & standings", () => {
  it("SQL standings match the TypeScript reference implementation", async () => {
    const sql = await db.query<{ team_id: string; rank: string; total_points: string }>(
      "select team_id, rank, total_points from get_tournament_standings($1)", [ids.final]);
    const res = await db.query<{ team_id: string; number: number; placement: number; kills: number }>(
      `select r.team_id, m.number, mr.placement, mr.kills from match_results mr
       join matches m on m.id = mr.match_id join tournament_registrations r on r.id = mr.registration_id
       where mr.tournament_id = $1`, [ids.final]);
    const ts = computeStandings(DEFAULT_SCORING, sql.rows.map((r) => r.team_id),
      res.rows.map((r) => ({ teamId: r.team_id, match: r.number, placement: r.placement, kills: r.kills })));
    expect(sql.rows).toHaveLength(24);
    expect(sql.rows.map((r) => [r.team_id, Number(r.rank), Number(r.total_points)]))
      .toEqual(ts.map((s) => [s.teamId, s.rank, s.total]));
  });

  it("only results of finished tournaments count for rankings", async () => {
    const liveTeams = await db.query<{ n: number }>(
      "select count(*)::int n from get_team_rankings(null, null, 200) g join tournament_registrations r on r.team_id = g.team_id where r.tournament_id = $1", [ids.live]);
    const verified = await db.query<{ n: number }>("select count(*)::int n from verified_results where tournament_id = $1", [ids.live]);
    expect(verified.rows[0].n).toBe(0);
    expect(liveTeams.rows[0].n).toBeGreaterThan(0); // these teams appear only through their finished tournaments
  });

  it("publishing results opens the dispute window; members can contest, others cannot", async () => {
    const match = (await db.query<{ id: string }>("select id from matches where tournament_id = $1 and number = 1", [ids.live])).rows[0].id;
    const reg = (await db.query<{ id: string }>(
      "select r.id from tournament_registrations r join teams t on t.id = r.team_id where r.tournament_id = $1 and t.captain_id = $2", [ids.live, ids.p001])).rows[0].id;
    await as(db, ids.p001, (q) => q("select open_dispute($1, $2, 'Placar da queda 1 está invertido', '{}')", [match, reg]));
    expect(await failsAs(db, ids.player, "select open_dispute($1, $2, 'Tentando contestar sem ser da equipe', '{}')", [match, reg]))
      .toMatch(/não participa/);
  });
});

describe("payments", () => {
  it("clients cannot create or confirm payments", async () => {
    expect(await failsAs(db, ids.org, "insert into payments(payer_id, provider, amount_cents) values ($1, 'x', 100)", [ids.org])).toMatch(/permission denied/);
    expect(await failsAs(db, ids.org, "select record_payment_status(gen_random_uuid(), 'confirmed', 'admin', 'ok')")).toMatch(/administrador/);
  });

  it("paid registrations stay blocked while payments are disabled", async () => {
    await db.query("update tournaments set entry_type = 'paid', entry_fee_cents = 500 where id = $1", [ids.open]);
    const players = await roster(ids.demoSquad);
    expect(await failsAs(db, ids.player, "select register_team($1, $2, $3::uuid[], '{}', null)", [ids.open, ids.demoSquad, players]))
      .toMatch(/pagas ainda não estão disponíveis/);
    await db.query("update tournaments set entry_type = 'free', entry_fee_cents = 0 where id = $1", [ids.open]);
  });
});

describe("result sheets & room status", () => {
  it("save_match_results swaps placements atomically and recomputes points", async () => {
    const match = (await db.query<{ id: string }>("select id from matches where tournament_id = $1 and number = 4", [ids.live])).rows[0].id;
    const regs = (await db.query<{ id: string }>("select id from tournament_registrations where tournament_id = $1 and status = 'confirmed' order by id limit 2", [ids.live])).rows;
    await as(db, ids.org, async (q) => {
      await q("select save_match_results($1, $2::jsonb)", [match, JSON.stringify([
        { registration_id: regs[0].id, placement: 1, kills: 2 }, { registration_id: regs[1].id, placement: 2, kills: 0 }])]);
      // swap 1st and 2nd in a single call — would violate unique(match, placement) without the deferred constraint
      await q("select save_match_results($1, $2::jsonb)", [match, JSON.stringify([
        { registration_id: regs[0].id, placement: 2, kills: 2 }, { registration_id: regs[1].id, placement: 1, kills: 0 }])]);
      const r = await q<{ registration_id: string; total_points: string }>("select registration_id, total_points from match_results where match_id = $1", [match]);
      const pts = Object.fromEntries(r.rows.map((x) => [x.registration_id, Number(x.total_points)]));
      expect(pts[regs[0].id]).toBe(11); // 9 + 2 kills
      expect(pts[regs[1].id]).toBe(12);
    });
    expect(await failsAs(db, ids.p001, "select save_match_results($1, '[]'::jsonb)", [match])).toMatch(/Sem permissão/);
  });

  it("room status is public but never exposes credentials", async () => {
    const r = await as(db, null, (q) => q<Record<string, unknown>>("select * from match_room_status($1)", [ids.live]));
    expect(r.rows.length).toBe(2);
    expect(Object.keys(r.rows[0])).not.toContain("room_password");
  });
});

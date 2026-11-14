import { describe, expect, it } from "vitest";
import { computeStandings, DEFAULT_SCORING, matchPoints, validateResultSheet, type ScoringConfig } from "@/lib/scoring";
import { signUpSchema, tournamentSchema } from "@/lib/validation";

describe("matchPoints", () => {
  it("uses the default table and kill points", () => {
    expect(matchPoints(DEFAULT_SCORING, 1, 7).total).toBe(19);
    expect(matchPoints(DEFAULT_SCORING, 10, 0).total).toBe(1);
    expect(matchPoints(DEFAULT_SCORING, 11, 2).total).toBe(2); // beyond table = 0 placement points
  });
  it("respects custom config and bonus limits", () => {
    const cfg: ScoringConfig = { ...DEFAULT_SCORING, placementPoints: [15, 10], killPoints: 2, maxBonus: 3 };
    expect(matchPoints(cfg, 2, 3, 3).total).toBe(19);
    expect(() => matchPoints(cfg, 1, 0, 4)).toThrow(/Bônus/);
  });
});

describe("computeStandings", () => {
  const r = (teamId: string, match: number, placement: number, kills: number) => ({ teamId, match, placement, kills });

  it("orders by total points", () => {
    const s = computeStandings(DEFAULT_SCORING, ["a", "b"], [r("a", 1, 2, 0), r("b", 1, 1, 0)]);
    expect(s.map((x) => x.teamId)).toEqual(["b", "a"]);
  });

  it("breaks ties with wins, then kills", () => {
    // a: 12 + 0 = 12 (1 win) ; b: 9 + 3 = 12 (0 wins)
    const s = computeStandings(DEFAULT_SCORING, ["a", "b"], [r("a", 1, 1, 0), r("b", 1, 2, 3)]);
    expect(s[0].teamId).toBe("a");
    const killsFirst = computeStandings({ ...DEFAULT_SCORING, tiebreakers: ["kills"] }, ["a", "b"], [r("a", 1, 1, 0), r("b", 1, 2, 3)]);
    expect(killsFirst[0].teamId).toBe("b");
  });

  it("shares rank when every tiebreaker is equal", () => {
    const s = computeStandings(DEFAULT_SCORING, ["a", "b", "c"], [r("a", 1, 3, 1), r("b", 2, 3, 1), r("c", 1, 1, 0)]);
    expect(s.map((x) => x.rank)).toEqual([1, 2, 2]);
  });

  it("teams without results stay at the bottom with zero", () => {
    const s = computeStandings(DEFAULT_SCORING, ["a", "z"], [r("a", 1, 5, 0)]);
    expect(s[1]).toMatchObject({ teamId: "z", total: 0, matches: 0, rank: 2 });
  });
});

describe("validateResultSheet", () => {
  it("flags duplicate and out-of-range placements", () => {
    expect(validateResultSheet([{ placement: 1, kills: 0 }, { placement: 1, kills: 0 }], 12)).toContain("Colocação 1 repetida.");
    expect(validateResultSheet([{ placement: 13, kills: 0 }], 12)[0]).toMatch(/fora do intervalo/);
    expect(validateResultSheet([{ placement: 1, kills: 3 }, { placement: 2, kills: 0 }], 12)).toEqual([]);
  });
});

describe("validation", () => {
  it("rejects weak passwords and invalid usernames", () => {
    const base = { display_name: "Ana", username: "ana_ff", email: "a@b.co", password: "senha1234", terms: "on" };
    expect(signUpSchema.safeParse(base).success).toBe(true);
    expect(signUpSchema.safeParse({ ...base, password: "12345678" }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...base, username: "Ana FF" }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...base, terms: undefined }).success).toBe(false);
  });

  it("tournament: squad requires 4 players and paid requires a fee", () => {
    const t = {
      name: "Copa", mode: "squad", platform: "mobile", region: "BR", max_teams: "12", team_size: "4", reserves_allowed: "1",
      matches_count: "4", starts_at: "2030-01-01T20:00", visibility: "public", entry_type: "free", dispute_window_minutes: "30",
      placement_points: "12,9,8", kill_points: "1", max_bonus: "0",
    };
    expect(tournamentSchema.safeParse(t).success).toBe(true);
    expect(tournamentSchema.safeParse({ ...t, team_size: "3" }).success).toBe(false);
    expect(tournamentSchema.safeParse({ ...t, entry_type: "paid", entry_fee: "0" }).success).toBe(false);
  });
});

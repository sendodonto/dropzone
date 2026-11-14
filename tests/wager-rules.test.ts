import { describe, expect, it } from "vitest";
import { composeRules } from "@/lib/wager-rules";

describe("composeRules", () => {
  it("lists only the chosen non-default options, in a fixed order", () => {
    expect(composeRules("pistola", "infinito", ["capa", "municao"])).toBe("Só pistola · Gelo infinito · Munição infinita · Só capa (só dano na cabeça)");
  });
  it("defaults produce no rules and unknown values are ignored", () => {
    expect(composeRules("livre", "normal", [])).toBe("");
    expect(composeRules("bazuca", "lava", ["voar", "<script>"])).toBe("");
  });
});

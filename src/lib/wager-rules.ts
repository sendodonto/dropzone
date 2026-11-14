// Fixed rule options for apostados (no free text). Shared by the form (client) and the action (server).
export const weaponOptions = [
  { value: "livre", label: "Armas livres" },
  { value: "pistola", label: "Só pistola" },
  { value: "doze", label: "Só doze (escopeta)" },
  { value: "smg", label: "Só submetralhadora" },
  { value: "rifle", label: "Só rifle" },
  { value: "sniper", label: "Só sniper" },
] as const;

export const gelOptions = [
  { value: "normal", label: "Gelo normal" },
  { value: "infinito", label: "Gelo infinito" },
  { value: "sem", label: "Sem gelo" },
] as const;

export const toggleRules = [
  { value: "municao", label: "Munição infinita" },
  { value: "capa", label: "Só capa (só dano na cabeça)" },
  { value: "sem-habilidade", label: "Sem habilidade de personagem" },
  { value: "sem-pet", label: "Sem pet" },
  { value: "sem-granada", label: "Sem granada" },
  { value: "sem-emulador", label: "Sem emulador (só celular)" },
] as const;

/** Builds the readable rules line stored on the wager, ignoring anything not in the allowlists. */
export function composeRules(weapon: string, gel: string, toggles: string[]) {
  const parts = [
    weaponOptions.find((o) => o.value === weapon && o.value !== "livre")?.label,
    gelOptions.find((o) => o.value === gel && o.value !== "normal")?.label,
    ...toggleRules.filter((o) => toggles.includes(o.value)).map((o) => o.label),
  ].filter(Boolean);
  return parts.join(" · ");
}

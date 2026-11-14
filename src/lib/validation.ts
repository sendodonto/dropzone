// Shared input schemas. Used by server actions (authoritative) and forms.
import { z } from "zod";

const trimmed = (min: number, max: number, label: string) =>
  z.string().trim().min(min, `${label}: mínimo de ${min} caracteres.`).max(max, `${label}: máximo de ${max} caracteres.`);
const optionalText = (max: number) =>
  z.string().trim().max(max).optional().transform((v) => (v ? v : null));
const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());
const intField = (min: number, max: number, label: string) =>
  z.coerce.number({ error: `${label} inválido.` }).int(`${label} deve ser inteiro.`).min(min, `${label}: mínimo ${min}.`).max(max, `${label}: máximo ${max}.`);

export const username = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,20}$/, "Username: 3 a 20 caracteres, apenas letras minúsculas, números e _.");

export const signUpSchema = z.object({
  display_name: trimmed(2, 40, "Nome"),
  username,
  email: z.email("Email inválido.").trim().toLowerCase(),
  password: z
    .string()
    .min(8, "A senha precisa de pelo menos 8 caracteres.")
    .max(72)
    .regex(/[A-Za-z]/, "A senha precisa de letras.")
    .regex(/[0-9]/, "A senha precisa de números."),
  terms: z.literal("on", { error: "Aceite os termos para continuar." }),
});

export const signInSchema = z.object({
  email: z.email("Email inválido.").trim().toLowerCase(),
  password: z.string().min(1, "Informe a senha."),
});

export const onboardingSchema = z.object({
  username,
  display_name: trimmed(2, 40, "Nome de exibição"),
  ff_id: z.string().trim().regex(/^(\d{5,15})?$/, "ID do Free Fire: apenas números (5 a 15 dígitos).").optional().default(""),
  region: z.enum(["BR", "LATAM", "NA"]),
  preferred_mode: z.enum(["squad", "duo", "solo"]),
  intent: z.enum(["play", "organize", "both"]),
});

export const profileSchema = onboardingSchema.omit({ intent: true }).extend({
  bio: optionalText(280),
  avatar_url: z.url().optional().or(z.literal("")).transform((v) => v || null),
});

export const teamSchema = z.object({
  name: trimmed(2, 32, "Nome do squad"),
  tag: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{2,5}$/, "Tag: 2 a 5 letras ou números."),
  description: optionalText(500),
  logo_url: z.url().optional().or(z.literal("")).transform((v) => v || null),
});

export const organizerSchema = z.object({
  name: trimmed(2, 60, "Nome"),
  description: optionalText(1000),
  contact_url: z.url("Link inválido.").optional().or(z.literal("")).transform((v) => v || null),
  logo_url: z.url().optional().or(z.literal("")).transform((v) => v || null),
});

const dt = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Data/hora inválida.");

export const tournamentSchema = z
  .object({
    name: trimmed(3, 80, "Nome do campeonato"),
    description: optionalText(4000),
    cover_url: z.url().optional().or(z.literal("")).transform((v) => v || null),
    logo_url: z.url().optional().or(z.literal("")).transform((v) => v || null),
    mode: z.enum(["squad", "duo", "solo"]),
    platform: z.enum(["mobile", "emulator", "mixed"]),
    region: z.enum(["BR", "LATAM", "NA"]),
    max_teams: intField(2, 100, "Quantidade de equipes"),
    team_size: intField(1, 4, "Jogadores por equipe"),
    reserves_allowed: intField(0, 2, "Reservas"),
    matches_count: intField(1, 20, "Quantidade de quedas"),
    starts_at: dt,
    registration_opens_at: dt.optional().or(z.literal("")),
    registration_closes_at: dt.optional().or(z.literal("")),
    requires_approval: checkbox,
    visibility: z.enum(["public", "unlisted", "private"]),
    entry_type: z.enum(["free", "paid", "sponsored", "external"]),
    payment_instructions: optionalText(500),
    entry_fee: z.coerce.number().min(0).max(10000).default(0),
    prize_pool: z.coerce.number().min(0).max(1_000_000).default(0),
    prize_description: optionalText(500),
    dispute_window_minutes: intField(0, 10080, "Prazo de contestação"),
    season_id: z.uuid().optional().or(z.literal("")).transform((v) => v || null),
    rules: z.string().max(20000).default(""),
    placement_points: z
      .string()
      .trim()
      .regex(/^\d{1,3}(\s*,\s*\d{1,3}){0,49}$/, "Pontos por colocação: números separados por vírgula."),
    kill_points: z.coerce.number().min(0).max(10),
    max_bonus: intField(0, 50, "Bônus máximo"),
    tiebreakers: z.string().default("wins,kills,best_placement,last_match"),
    prizes: z.string().default("[]"),
    publish: checkbox,
  })
  .superRefine((v, ctx) => {
    if (v.mode === "squad" && v.team_size !== 4) ctx.addIssue({ code: "custom", path: ["team_size"], message: "Squad usa 4 jogadores." });
    if (v.mode === "duo" && v.team_size !== 2) ctx.addIssue({ code: "custom", path: ["team_size"], message: "Duo usa 2 jogadores." });
    if (v.mode === "solo" && v.team_size !== 1) ctx.addIssue({ code: "custom", path: ["team_size"], message: "Solo usa 1 jogador." });
    if ((v.entry_type === "paid" || v.entry_type === "external") && v.entry_fee <= 0) ctx.addIssue({ code: "custom", path: ["entry_fee"], message: "Informe o valor da inscrição." });
    if (v.entry_type === "external" && !v.payment_instructions) ctx.addIssue({ code: "custom", path: ["payment_instructions"], message: "Explique como pagar (ex.: chave Pix)." });
    if (v.registration_opens_at && v.registration_closes_at && v.registration_closes_at <= v.registration_opens_at)
      ctx.addIssue({ code: "custom", path: ["registration_closes_at"], message: "O encerramento deve ser depois da abertura." });
    if (v.registration_closes_at && v.registration_closes_at > v.starts_at)
      ctx.addIssue({ code: "custom", path: ["registration_closes_at"], message: "Inscrições devem encerrar antes do início." });
  });

export const roomSchema = z.object({
  match_id: z.uuid(),
  room_code: trimmed(1, 30, "ID da sala"),
  room_password: optionalText(30),
  instructions: optionalText(1000),
  audience: z.enum(["all_participants", "confirmed", "specific"]),
  opens_at: dt.optional().or(z.literal("")),
  map: trimmed(2, 30, "Mapa"),
  scheduled_at: dt.optional().or(z.literal("")),
  targets: z.array(z.uuid()).default([]),
  publish: checkbox,
});

export const resultRowSchema = z.object({
  registration_id: z.uuid(),
  placement: z.coerce.number().int().min(1).max(100),
  kills: z.coerce.number().int().min(0).max(200),
  bonus_points: z.coerce.number().int().min(-50).max(50).default(0),
});

export const reportSchema = z.object({
  target_type: z.enum(["user", "team", "tournament", "match"]),
  target_id: z.uuid(),
  tournament_id: z.uuid().optional().or(z.literal("")).transform((v) => v || null),
  reason: z.enum(["fraud", "suspicious_result", "misconduct", "false_information", "rules_violation"]),
  description: trimmed(10, 2000, "Descrição"),
  evidence_urls: z.array(z.string().max(500)).max(5).default([]),
});

export const announcementSchema = z.object({
  tournament_id: z.uuid(),
  title: trimmed(3, 120, "Título"),
  body: trimmed(1, 4000, "Mensagem"),
  pinned: checkbox,
});

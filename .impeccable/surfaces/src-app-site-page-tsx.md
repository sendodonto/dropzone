---
version: 1
slug: "src-app-site-page-tsx"
primary_target: "src/app/(site)/page.tsx"
related_targets: ["src/app","src/components"]
---

# Surface brief: DROPZONE site-wide (replacement world)

Scope: whole web app. Landing / marketplace / tournament page = Persuade; player dashboard, organizer console, admin = Operate.
Audience & job: Brazilian Free Fire players (find, register, get the room, check standings) and organizers (run the tournament). Constraints: palette pinned by the user to purple, white and black; all functionality preserved; no game artwork; demo data labeled.
History: the rolled direction (Muro de lambe-lambe) was abandoned mid-build at the user's explicit request ("ta ficando horrível ... muita cara de IA"); the user told us to treat the skills as higher authority than the brief. The lambe rendition sat in the calibration cluster "flat ink, black boxes, heavy condensed display type", and the prior build sat in "near-black with one neon accent". The replacement direction below was chosen to leave both clusters.
Unresolved: final product name (copy in src/config/site.ts).

## Direction contract

THESIS: A calm, friendly product in the spirit of a modern consumer fintech app (the user named Nubank as the quality reference, not a world to copy): white ground, soft gray surfaces, generous rounding, and one brand blue that fills the hero and banners and marks every action. It refuses the dark esports dashboard and any glow, grid or poster costume.

OWN-WORLD: White ground; cards are soft gray fills (oklch 0.967) with no outline and 24px corners; inputs white with 12px corners; buttons are pills. Brand blue oklch(0.52 0.2 262) fills the hero, the tournament banner and the champions band, with white text on it; black type and a black closing field and footer. One friendly geometric sans (Figtree) for everything, headings bold and tight in sentence case. Status is a dot plus words; avatars are circles; no icons beside facts.

STORY: The visitor sees, inside the blue field, what the platform does and a working search, plus the tournaments live right now; scrolls to open registrations, agenda and rankings; opens a tournament and registers the squad.

FIRST VIEWPORT: Full-bleed blue field. Left: "Seu próximo campeonato começa aqui." in white bold sans at about 4.6rem, the subcopy, a white pill search with a black pill "Buscar", four underlined shortcuts. Right: a white rounded card "Agora no DROPZONE" listing up to four real tournaments with status, time and a slot bar.

FORM: User-directed revision on top of the light committed-field build: palette changed from purple to blue and the reference set to Nubank's friendliness ("se inspirar ... no visual da nubank que é bonito e intuitivo, e vamos trocar o roxo por azul"); seed: none (pinned). Signature interaction: rows and cards press (scale 0.985) on pointer-down; one settle of the hero on load.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

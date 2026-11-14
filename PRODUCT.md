# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

A two-sided marketplace. Neither side outranks the other; when needs conflict, the decision has to work for both.

- **Players (jogadores):** Free Fire players who find tournaments, build a squad (captain + members), register, receive the custom-room ID/password at the right time, and follow results and rankings. Most of them use a phone, so the mobile experience is extremely important (from the original brief).
- **Organizers (organizadores):** people and communities running their own tournaments. They manage registrations, rooms, results, announcements, disputes and logs. Any user can become an organizer without stopping being a player.
- **Administrator:** the platform owner. They moderate users, organizers, tournaments and reports, and control global settings. The platform also runs its own official community tournaments on the same infrastructure.

## Product Purpose

DROPZONE lets anyone organize a Free Fire tournament, and lets players find and enter tournaments easily, inside one ecosystem. Success means organizers can run a full tournament without spreadsheets or chat-group chaos, and players can go from discovery to the right room to verified results with no friction.

## Positioning

What separates DROPZONE from WhatsApp/Discord groups and from other tournament platforms (all four are confirmed):

1. **Automatic organization:** points, standings and tiebreakers are calculated by the system from placement and kills. No spreadsheets.
2. **Secure rooms:** room ID and password are released only to authorized teams (confirmed, or targeted), only after publication and the release time.
3. **Ranking and history:** only verified results from finished tournaments become rankings, seasons, achievements and reputation for players and squads.
4. **Trust:** clear rules, disputes with a deadline, moderation, and an auditable log of every important decision and result correction.

## Operating Context

- Free Fire has no official API for custom rooms. The organizer creates the room in the game manually; the platform stores, protects and releases the credentials.
- Tournament lifecycle: draft → registration open/closed → live → finished (or cancelled). Results are entered per match (queda) and published; each publication opens a dispute window.
- Squad default: 4 starters plus an optional reserve when the rules allow it. A player can never play for two squads in the same tournament.
- Interface language: Brazilian Portuguese (pt-BR). Times are shown in Brasília time.

## Capabilities and Constraints

- Stack in place: Next.js (App Router) + TypeScript + Tailwind + shadcn/ui (Base UI) + Lucide icons; Supabase (Auth, Postgres with RLS, Storage, Realtime); deploy target Vercel.
- **Payments are structure-only and disabled.** Paid registrations and cash prizes require legal validation, applicable authorization and a compatible provider. The product must never imply that any organizer may charge fees or award cash prizes freely, and must never simulate payments as real.
- Organizer plans (FREE / PRO) exist as structure. Subscription billing stays off until real financial integration exists.
- Announced prizes are the organizer's responsibility.
- Undecided: the final product name, region scope beyond Brazil, and the email notification provider.

## Brand Commitments

- **DROPZONE is a provisional name.** It may change, so nothing should lock identity to it; name and copy live in `src/config/site.ts`.
- From the original brief: a professional esports-platform feel (FACEIT, Battlefy and Challengermode as quality references, never to be copied). No emojis standing in for icons, no buttons without a function, and no features that only appear to work.
- The platform is independent of Garena; the disclaimer must stay.

## Evidence on Hand

- **No real users, testimonials, customer numbers, partners or press exist.** None of these may be invented or implied.
- **No official logo, photography or artwork exists.** Current marks are provisional.
- Demo data (`supabase/seed.sql`) is fictional, flagged `is_demo`, and must always be presented as demonstration, never as real competition.

## Product Principles

1. **Both sides win or neither does.** A choice that helps organizers at the players' expense, or the reverse, is wrong.
2. **Automate the drudgery, keep humans for judgment.** The system computes points, standings and rankings; people decide disputes, removals and moderation, always with a recorded reason.
3. **Trust is the product.** Credentials appear only for those who are authorized, results are verifiable, and every correction leaves a trail.
4. **Honest by default.** Nothing fake: no simulated payments, no invented proof, demo data clearly labeled.
5. **Phone first.** The critical paths (find, register, get the room, check standings) must be fast and complete on a phone.

## Accessibility & Inclusion

No product-specific standard has been mandated. The brief asks for basic accessibility: visible focus, keyboard reachability, labeled controls and sufficient contrast.

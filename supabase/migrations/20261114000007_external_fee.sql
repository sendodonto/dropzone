-- DROPZONE · 0007 · Entry fee paid directly to the organizer ("external").
-- The platform never receives, holds or records money for these: it only displays the fee and the
-- organizer's payment instructions, and every registration waits for the organizer's manual approval.
-- Platform-processed payments ('paid') stay disabled as before.

alter type public.entry_type add value if not exists 'external';

alter table public.tournaments
  add column if not exists payment_instructions text check (char_length(payment_instructions) <= 500);

-- Compare as text: a freshly added enum value cannot be used as a literal in the same transaction.
alter table public.tournaments
  add constraint tournaments_external_fee_check check (
    entry_type::text <> 'external'
    or (entry_fee_cents > 0 and requires_approval and coalesce(trim(payment_instructions), '') <> '')
  );

grant insert (payment_instructions), update (payment_instructions) on public.tournaments to authenticated;

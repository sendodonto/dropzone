-- DROPZONE · 0005 · Pin search_path on the remaining helper functions (Supabase linter 0011).
alter function public.slugify(text) set search_path = '';
alter function public.touch_updated_at() set search_path = '';
alter function public.try_uuid(text) set search_path = '';

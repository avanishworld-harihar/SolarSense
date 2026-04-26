-- Optional installer-facing next step label on pipeline cards.

alter table public.projects add column if not exists next_action text;

comment on column public.projects.next_action is 'Next action for crew, e.g. Site survey (shown above progress).';

-- Safe multi-admin saving for the MLS hubs.
-- Paste this once in Supabase SQL Editor, then enable Realtime for public.mls_blood_bank.

alter table public.mls_blood_bank
  alter column data type jsonb using data::jsonb,
  add column if not exists version bigint not null default 0,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists last_client_id text;

create table if not exists public.mls_blood_bank_history (
  history_id bigserial primary key,
  id text not null,
  version bigint not null,
  data jsonb not null,
  saved_at timestamptz not null default now(),
  saved_by_client text
);

create index if not exists mls_blood_bank_history_id_version_idx
  on public.mls_blood_bank_history (id, version desc);

create or replace function public.mls_safe_save_doc(
  p_id text,
  p_data jsonb,
  p_expected_version bigint,
  p_client_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.mls_blood_bank%rowtype;
  next_version bigint;
begin
  select *
    into current_row
    from public.mls_blood_bank
   where id = p_id
   for update;

  if not found then
    if coalesce(p_expected_version, 0) <> 0 then
      return jsonb_build_object(
        'status', 'conflict',
        'id', p_id,
        'version', 0,
        'data', null,
        'message', 'Document does not exist at expected version.'
      );
    end if;

    insert into public.mls_blood_bank (id, data, version, updated_at, last_client_id)
    values (p_id, p_data, 1, now(), p_client_id)
    returning * into current_row;

    return jsonb_build_object(
      'status', 'saved',
      'id', current_row.id,
      'version', current_row.version,
      'updated_at', current_row.updated_at,
      'data', coalesce(current_row.data, '{}'::jsonb)
    );
  end if;

  if current_row.version <> coalesce(p_expected_version, 0) then
    return jsonb_build_object(
      'status', 'conflict',
      'id', current_row.id,
      'version', current_row.version,
      'updated_at', current_row.updated_at,
        'data', coalesce(current_row.data, '{}'::jsonb),
      'message', 'Supabase has a newer version.'
    );
  end if;

  insert into public.mls_blood_bank_history (id, version, data, saved_at, saved_by_client)
  values (current_row.id, current_row.version, coalesce(current_row.data, '{}'::jsonb), current_row.updated_at, current_row.last_client_id);

  next_version := current_row.version + 1;

  update public.mls_blood_bank
     set data = p_data,
         version = next_version,
         updated_at = now(),
         last_client_id = p_client_id
   where id = p_id
   returning * into current_row;

  return jsonb_build_object(
    'status', 'saved',
    'id', current_row.id,
    'version', current_row.version,
    'updated_at', current_row.updated_at,
    'data', coalesce(current_row.data, '{}'::jsonb)
  );
end;
$$;

grant execute on function public.mls_safe_save_doc(text, jsonb, bigint, text) to anon, authenticated;
grant select, insert, update on public.mls_blood_bank to anon, authenticated;
grant select, insert on public.mls_blood_bank_history to anon, authenticated;
grant usage, select on sequence public.mls_blood_bank_history_history_id_seq to anon, authenticated;

alter table public.mls_blood_bank replica identity full;

do $$
begin
  if not exists (
    select 1
      from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'mls_blood_bank'
  ) then
    alter publication supabase_realtime add table public.mls_blood_bank;
  end if;
end;
$$;

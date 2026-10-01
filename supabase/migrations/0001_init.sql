-- NAMI · schema iniziale.
-- Sul server restano in chiaro solo id, date, id dei conti e giorno delle ricorrenze.
-- Tutto il resto sta in `payload`, cifrato sul telefono con la chiave di coppia.

-- ── Coppia e membri ─────────────────────────────────────────────────────────

create table public.households (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table public.members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  household_id uuid not null references public.households (id) on delete cascade,
  -- Chiave di coppia avvolta dalla frase segreta e dal kit di recupero di questa persona.
  wrapped_key jsonb not null,
  recovery_key jsonb not null,
  created_at timestamptz not null default now()
);
create index members_household_idx on public.members (household_id);

-- Inviti: `lookup` è la parte pubblica del codice, la chiave è avvolta dal codice intero.
create table public.invites (
  lookup text primary key,
  household_id uuid not null references public.households (id) on delete cascade,
  wrapped_key jsonb not null,
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  expires_at timestamptz not null default now() + interval '15 minutes'
);

-- Coppia dell'utente collegato (null se non ne ha ancora una).
create function public.current_household() returns uuid
language sql stable security definer set search_path = ''
as $$
  select household_id from public.members where user_id = (select auth.uid())
$$;

-- ── Dati cifrati ────────────────────────────────────────────────────────────

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  payload text not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (household_id, id)
);

create table public.recurrences (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  account_id uuid not null,
  day smallint not null check (day between 1 and 31),
  payload text not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (household_id, id),
  foreign key (household_id, account_id) references public.accounts (household_id, id)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  account_id uuid not null,
  -- Solo per i giroconti: conto di arrivo.
  to_account_id uuid,
  date date not null,
  payload text not null,
  created_by uuid not null default auth.uid() references auth.users (id),
  -- Solo per le spese fisse: una sola registrazione per ricorrenza e mese.
  recurrence_id uuid,
  recurrence_month date,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (household_id, account_id) references public.accounts (household_id, id),
  foreign key (household_id, to_account_id) references public.accounts (household_id, id),
  foreign key (household_id, recurrence_id) references public.recurrences (household_id, id),
  unique (recurrence_id, recurrence_month)
);
create index transactions_household_date_idx on public.transactions (household_id, date desc);

create table public.piggy_banks (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  payload text not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (household_id, id)
);

create table public.piggy_moves (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  piggy_bank_id uuid not null,
  account_id uuid not null,
  date date not null,
  payload text not null,
  created_by uuid not null default auth.uid() references auth.users (id),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (household_id, piggy_bank_id) references public.piggy_banks (household_id, id),
  foreign key (household_id, account_id) references public.accounts (household_id, id)
);

-- Regole esercente → categoria, budget e impostazioni: solo payload cifrato.
create table public.rules (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  payload text not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  payload text not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.settings (
  household_id uuid primary key references public.households (id) on delete cascade,
  payload text not null,
  updated_at timestamptz not null default now()
);

-- ── Row Level Security: ognuno vede solo la propria coppia ──────────────────

alter table public.households enable row level security;
alter table public.members enable row level security;
alter table public.invites enable row level security;

create policy households_select on public.households
  for select to authenticated
  using (id = (select public.current_household()));

create policy members_select on public.members
  for select to authenticated
  using (household_id = (select public.current_household()));

-- Ognuno può cambiare solo la propria riga (es. nuova frase segreta), senza cambiare coppia.
create policy members_update_own on public.members
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and household_id = (select public.current_household()));

create policy invites_household on public.invites
  for all to authenticated
  using (household_id = (select public.current_household()))
  with check (household_id = (select public.current_household()) and created_by = (select auth.uid()));

do $$
declare
  t text;
begin
  foreach t in array array[
    'accounts', 'recurrences', 'transactions', 'piggy_banks', 'piggy_moves', 'rules', 'budgets', 'settings'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy household_all on public.%I for all to authenticated
         using (household_id = (select public.current_household()))
         with check (household_id = (select public.current_household()))',
      t
    );
  end loop;
end $$;

-- ── Ingresso nella coppia (le uniche strade per diventare membro) ───────────

-- Il primo utente crea la coppia.
create function public.create_household(p_wrapped_key jsonb, p_recovery_key jsonb) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_household uuid;
begin
  if v_user is null then
    raise exception 'Accesso richiesto';
  end if;
  if exists (select 1 from public.members where user_id = v_user) then
    raise exception 'Fai già parte di una coppia';
  end if;
  insert into public.households default values returning id into v_household;
  insert into public.members (user_id, household_id, wrapped_key, recovery_key)
  values (v_user, v_household, p_wrapped_key, p_recovery_key);
  return v_household;
end $$;

-- Il partner legge la chiave avvolta dall'invito (la sblocca solo chi ha il codice intero).
create function public.get_invite(p_lookup text) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select wrapped_key from public.invites
  where lookup = p_lookup and expires_at > now() and (select auth.uid()) is not null
$$;

-- Il partner entra nella coppia con le proprie chiavi avvolte; l'invito viene cancellato.
create function public.join_household(p_lookup text, p_wrapped_key jsonb, p_recovery_key jsonb) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_household uuid;
begin
  if v_user is null then
    raise exception 'Accesso richiesto';
  end if;
  if exists (select 1 from public.members where user_id = v_user) then
    raise exception 'Fai già parte di una coppia';
  end if;
  select household_id into v_household from public.invites
  where lookup = p_lookup and expires_at > now()
  for update;
  if v_household is null then
    raise exception 'Invito non valido o scaduto';
  end if;
  if (select count(*) from public.members where household_id = v_household) >= 2 then
    raise exception 'La coppia è già al completo';
  end if;
  insert into public.members (user_id, household_id, wrapped_key, recovery_key)
  values (v_user, v_household, p_wrapped_key, p_recovery_key);
  delete from public.invites where lookup = p_lookup;
  return v_household;
end $$;

revoke execute on function public.current_household() from public, anon;
revoke execute on function public.create_household(jsonb, jsonb) from public, anon;
revoke execute on function public.get_invite(text) from public, anon;
revoke execute on function public.join_household(text, jsonb, jsonb) from public, anon;
grant execute on function public.current_household() to authenticated;
grant execute on function public.create_household(jsonb, jsonb) to authenticated;
grant execute on function public.get_invite(text) to authenticated;
grant execute on function public.join_household(text, jsonb, jsonb) to authenticated;

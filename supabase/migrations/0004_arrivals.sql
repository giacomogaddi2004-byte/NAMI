-- Apple Pay: arrivi dall'automazione dei Comandi dell'iPhone.
--
-- Ogni persona ha un codice segreto personale (lo genera l'app e lo mostra una sola volta).
-- Sul server resta solo la sua impronta SHA-256. La funzione `apple-pay` chiama `ingest_arrival`,
-- che può soltanto aggiungere un arrivo: non legge e non cancella nulla.
-- Gli arrivi sono in chiaro fino a quando qualcuno li conferma in app (diventano un movimento cifrato)
-- o li elimina.

create table public.shortcut_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  household_id uuid not null references public.households (id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now()
);

alter table public.shortcut_tokens enable row level security;

create policy tokens_own_select on public.shortcut_tokens
  for select to authenticated using (user_id = (select auth.uid()));
create policy tokens_own_insert on public.shortcut_tokens
  for insert to authenticated
  with check (user_id = (select auth.uid()) and household_id = (select public.current_household()));
create policy tokens_own_update on public.shortcut_tokens
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and household_id = (select public.current_household()));
create policy tokens_own_delete on public.shortcut_tokens
  for delete to authenticated using (user_id = (select auth.uid()));

create table public.arrivals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Testo così come lo manda il Comando: l'app lo interpreta.
  amount_raw text not null,
  merchant text not null,
  card text not null,
  received_at timestamptz not null default now()
);
create index arrivals_household_idx on public.arrivals (household_id, received_at);

alter table public.arrivals enable row level security;

-- Tutta la coppia vede e smaltisce gli arrivi; nessuno può inserirli direttamente.
create policy arrivals_select on public.arrivals
  for select to authenticated using (household_id = (select public.current_household()));
create policy arrivals_delete on public.arrivals
  for delete to authenticated using (household_id = (select public.current_household()));

create function public.ingest_arrival(p_token text, p_amount text, p_merchant text, p_card text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid;
  v_household uuid;
begin
  select user_id, household_id into v_user, v_household
  from public.shortcut_tokens
  where token_hash = encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex');

  if v_user is null then
    raise exception 'Codice non valido' using errcode = '28000';
  end if;

  -- Freno di sicurezza: se un codice finisse in mani sbagliate non può riempire il database.
  if (select count(*) from public.arrivals where household_id = v_household and received_at > now() - interval '1 hour') >= 100 then
    raise exception 'Troppi arrivi in un’ora' using errcode = '54000';
  end if;

  insert into public.arrivals (household_id, user_id, amount_raw, merchant, card)
  values (
    v_household,
    v_user,
    left(trim(coalesce(p_amount, '')), 40),
    left(trim(coalesce(p_merchant, '')), 200),
    left(trim(coalesce(p_card, '')), 100)
  );
end $$;

revoke execute on function public.ingest_arrival(text, text, text, text) from public;
grant execute on function public.ingest_arrival(text, text, text, text) to anon, authenticated;

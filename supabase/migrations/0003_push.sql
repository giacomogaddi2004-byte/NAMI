-- Notifiche push: dispositivi iscritti e registro degli invii giornalieri.

create table public.push_subscriptions (
  endpoint text primary key,
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index push_subscriptions_household_idx on public.push_subscriptions (household_id);

alter table public.push_subscriptions enable row level security;

-- Ognuno gestisce solo i propri dispositivi, e solo nella propria coppia.
create policy push_own_select on public.push_subscriptions
  for select to authenticated using (user_id = (select auth.uid()));
create policy push_own_insert on public.push_subscriptions
  for insert to authenticated
  with check (user_id = (select auth.uid()) and household_id = (select public.current_household()));
create policy push_own_update on public.push_subscriptions
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and household_id = (select public.current_household()));
create policy push_own_delete on public.push_subscriptions
  for delete to authenticated using (user_id = (select auth.uid()));

-- Un invio al giorno al massimo. Lo usa solo la funzione del server: nessuna regola, nessun accesso dall'app.
create table public.push_runs (
  run_date date primary key,
  created_at timestamptz not null default now()
);
alter table public.push_runs enable row level security;

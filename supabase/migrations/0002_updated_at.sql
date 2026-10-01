-- `updated_at` lo decide sempre il server: serve ai telefoni per scaricare solo le novità.

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'accounts', 'recurrences', 'transactions', 'piggy_banks', 'piggy_moves', 'rules', 'budgets', 'settings'
  ] loop
    execute format(
      'create trigger touch_updated_at before insert or update on public.%I
         for each row execute function public.touch_updated_at()',
      t
    );
  end loop;
end $$;

-- Test delle regole di sicurezza (RLS). Da incollare nell'SQL Editor di Supabase.
-- Crea tre utenti finti (A e B della coppia, X estraneo), prova cosa vede ciascuno
-- e alla fine annulla tutto: nel database non resta nulla.
-- Se va tutto bene compare "Tutti i test RLS superati"; altrimenti un errore dice quale prova è fallita.

do $$
declare
  u_a uuid := gen_random_uuid();
  u_b uuid := gen_random_uuid();
  u_x uuid := gen_random_uuid();
  h_a uuid;
  h_x uuid;
  acc uuid := gen_random_uuid();
  n int;
begin
  begin
    insert into auth.users (id, email) values
      (u_a, 'a@test.nami'), (u_b, 'b@test.nami'), (u_x, 'x@test.nami');

    -- A crea la coppia e inserisce dati e un invito.
    perform set_config('request.jwt.claims', json_build_object('sub', u_a, 'role', 'authenticated')::text, true);
    set local role authenticated;
    h_a := public.create_household('{}'::jsonb, '{}'::jsonb);
    insert into public.accounts (id, household_id, payload) values (acc, h_a, 'cifrato');
    insert into public.transactions (household_id, account_id, date, payload) values (h_a, acc, current_date, 'cifrato');
    insert into public.invites (lookup, household_id, wrapped_key) values ('TEST01', h_a, '{}'::jsonb);
    assert (select count(*) from public.accounts) = 1, 'A deve vedere il proprio conto';

    -- X, estraneo senza coppia, non legge e non scrive nulla.
    perform set_config('request.jwt.claims', json_build_object('sub', u_x, 'role', 'authenticated')::text, true);
    assert (select count(*) from public.households) = 0, 'X non deve vedere coppie';
    assert (select count(*) from public.members) = 0, 'X non deve vedere membri';
    assert (select count(*) from public.accounts) = 0, 'X non deve vedere conti';
    assert (select count(*) from public.transactions) = 0, 'X non deve vedere movimenti';
    assert (select count(*) from public.invites) = 0, 'X non deve vedere inviti';

    update public.accounts set payload = 'manomesso';
    get diagnostics n = row_count;
    assert n = 0, 'X non deve modificare conti altrui';

    delete from public.transactions;
    get diagnostics n = row_count;
    assert n = 0, 'X non deve cancellare movimenti altrui';

    begin
      insert into public.accounts (household_id, payload) values (h_a, 'intruso');
      assert false, 'X non deve inserire conti nella coppia di A';
    exception when insufficient_privilege then null;
    end;

    begin
      insert into public.members (user_id, household_id, wrapped_key, recovery_key) values (u_x, h_a, '{}', '{}');
      assert false, 'X non deve aggiungersi da solo alla coppia di A';
    exception when insufficient_privilege then null;
    end;

    -- X con una coppia tutta sua continua a non vedere quella di A.
    h_x := public.create_household('{}'::jsonb, '{}'::jsonb);
    assert (select count(*) from public.accounts) = 0, 'X con la propria coppia non deve vedere i conti di A';
    assert (select count(*) from public.members) = 1, 'X deve vedere solo se stesso';

    begin
      update public.members set household_id = h_a where user_id = u_x;
      assert false, 'X non deve spostarsi nella coppia di A';
    exception when insufficient_privilege then null;
    end;

    -- B entra con l'invito e vede tutto; l'invito sparisce.
    perform set_config('request.jwt.claims', json_build_object('sub', u_b, 'role', 'authenticated')::text, true);
    assert public.get_invite('TEST01') is not null, 'B deve poter leggere l''invito';
    assert public.get_invite('NONCE0') is null, 'Un codice sbagliato non deve dare nulla';
    assert public.join_household('TEST01', '{}'::jsonb, '{}'::jsonb) = h_a, 'B deve entrare nella coppia di A';
    assert (select count(*) from public.accounts) = 1, 'B deve vedere il conto di A';
    assert (select count(*) from public.transactions) = 1, 'B deve vedere il movimento di A';
    assert (select count(*) from public.members) = 2, 'B deve vedere i due membri';
    assert (select count(*) from public.invites) = 0, 'L''invito usato deve essere cancellato';
    assert public.get_invite('TEST01') is null, 'L''invito non deve essere riutilizzabile';

    -- Chi non ha fatto l'accesso non vede nulla.
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    set local role anon;
    begin
      select count(*) into n from public.accounts;
      assert n = 0, 'Senza accesso non si devono vedere conti';
    exception when insufficient_privilege then null;
    end;
    begin
      select count(*) into n from public.members;
      assert n = 0, 'Senza accesso non si devono vedere membri';
    exception when insufficient_privilege then null;
    end;

    raise exception 'ANNULLA_TUTTO';
  exception when others then
    if sqlerrm <> 'ANNULLA_TUTTO' then
      raise;
    end if;
  end;
end $$;

select 'Tutti i test RLS superati' as risultato;

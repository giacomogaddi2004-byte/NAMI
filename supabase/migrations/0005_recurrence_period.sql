-- Spese fisse con una fine (le rate): periodo in chiaro, solo per non mandare avvisi
-- a rate finite o non ancora iniziate. Il resto (nome, importo...) resta cifrato.
-- Le righe esistenti restano vuote = "sempre attive".

alter table public.recurrences
  add column if not exists starts_on date,
  add column if not exists ends_on date;

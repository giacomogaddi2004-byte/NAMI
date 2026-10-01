-- Rimuove tutto ciò che riguardava l'automazione Apple Pay (annullata).
-- Cancella i pagamenti in attesa e i codici personali: nessun dato di NAMI vero viene toccato.

drop function if exists public.ingest_arrival(text, text, text, text);
drop table if exists public.arrivals;
drop table if exists public.shortcut_tokens;

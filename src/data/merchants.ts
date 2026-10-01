// Elenco iniziale "esercente → categoria": catene e servizi comuni in Italia.
// I nomi sono già in forma normalizzata (minuscole, senza accenti né simboli).
import type { CategoryKey } from './categories'

export const BUILTIN_MERCHANTS: Partial<Record<CategoryKey, string[]>> = {
  supermercato: [
    'esselunga', 'coop', 'ipercoop', 'conad', 'lidl', 'eurospin', 'carrefour', 'pam', 'panorama', 'md', 'aldi', 'penny',
    'iper', 'il gigante', 'bennet', 'famila', 'despar', 'eurospar', 'interspar', 'tigros', 'unes', 'crai',
    'todis', 'naturasi', 'ins mercato', 'tuodi', 'dok', 'decò', 'deco', 'basko', 'simply', 'sisa',
  ],
  cibo: [
    'glovo', 'deliveroo', 'just eat', 'justeat', 'uber eats', 'mcdonald s', 'mcdonalds', 'burger king', 'kfc', 'old wild west',
    'roadhouse', 'starbucks', 'autogrill', 'chef express', 'spontini', 'rossopomodoro', 'la piadineria', 'poke house',
    'domino s', 'alice pizza', 'five guys', 'eataly', 'too good to go',
  ],
  macchina: [
    'eni', 'agip', 'enilive', 'q8', 'ip', 'tamoil', 'esso', 'shell', 'totalerg', 'repsol', 'conad carburanti',
    'telepass', 'autostrade', 'unipolmove', 'aci', 'norauto', 'midas', 'easypark', 'mooneygo',
  ],
  trasporti: [
    'trenitalia', 'italo', 'trenord', 'atm', 'atac', 'gtt', 'anm', 'tper', 'amt', 'actv', 'flixbus', 'itabus', 'uber',
    'free now', 'freenow', 'itaxi', 'enjoy', 'share now', 'bikemi',
  ],
  abbonamenti: [
    'netflix', 'disney', 'disney plus', 'spotify', 'prime video', 'amazon prime', 'dazn', 'now tv', 'sky', 'apple com bill',
    'icloud', 'google one', 'youtube premium', 'crunchyroll', 'paramount', 'audible', 'kindle unlimited', 'playstation',
    'nintendo', 'xbox', 'chatgpt', 'openai', 'claude', 'anthropic', 'canva', 'adobe', 'capcut', 'higgsfield', 'dropbox',
  ],
  casa: [
    'enel', 'enel energia', 'servizio elettrico nazionale', 'a2a', 'iren', 'hera', 'acea', 'edison', 'plenitude', 'sorgenia',
    'illumia', 'tim', 'vodafone', 'windtre', 'wind tre', 'iliad', 'fastweb', 'ho mobile', 'very mobile', 'kena', 'postemobile',
    'ikea', 'leroy merlin', 'brico', 'bricoman', 'obi', 'maisons du monde', 'tecnomat',
  ],
  salute: [
    'farmacia', 'parafarmacia', 'lloyds', 'lloydsfarmacia', 'dr max', 'boots', 'studio dentistico', 'dentista', 'ottica',
    'salmoiraghi', 'grandvision', 'virgin active', 'mcfit', 'anytime fitness', 'fitactive', 'palestra',
  ],
  shopping: [
    'amazon', 'zalando', 'zara', 'h m', 'hm', 'ovs', 'uniqlo', 'decathlon', 'mediaworld', 'unieuro', 'euronics', 'trony',
    'apple store', 'tiger', 'primark', 'bershka', 'pull bear', 'stradivarius', 'mango', 'nike', 'adidas', 'foot locker',
    'feltrinelli', 'mondadori', 'sephora', 'douglas', 'kiko', 'tigotà', 'tigota', 'acqua sapone', 'vinted', 'shein', 'temu',
    'aliexpress', 'ebay',
  ],
  viaggi: [
    'booking', 'booking com', 'airbnb', 'ryanair', 'easyjet', 'ita airways', 'wizz air', 'volotea', 'vueling', 'lufthansa',
    'expedia', 'trivago', 'hotels com', 'trainline', 'omio', 'skyscanner',
  ],
  divertimento: [
    'cinema', 'uci cinemas', 'the space', 'ticketone', 'ticketmaster', 'vivaticket', 'steam', 'epic games',
    'gardaland', 'mirabilandia', 'museo', 'teatro',
  ],
  regali: ['interflora', 'smartbox', 'wonderbox'],
}

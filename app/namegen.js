// ============================================================
// Untangle — random name generator
// Pure data/functions, no dependency on app state. Shared by
// app/index.html and app/widget.html.
// ============================================================

const RANDOM_NAMES = [
  'Aldric','Maren','Corvus','Sylvaine','Theron','Vesna','Calix','Nira',
  'Eldrin','Sable','Gareth','Faye','Orin','Tessaly','Bram','Lyria',
  'Caelan','Wren','Dorian','Mira','Harkin','Elara','Jasper','Seren',
  'Volkmar','Ashild','Renn','Idris','Tova','Crispin','Leora','Fenwick',
  'Isolde','Gorin','Petra','Dax','Vanya','Soren','Eira','Hadwin',
  'Morwenna','Lyle','Zara','Edric','Tanith','Borin','Calla','Varik',
  'Embla','Raul','Sigrún','Oswin','Dalia','Fenn','Rhys','Kira',
  'Arvid','Seraphine','Tarquin','Mael','Ysolde','Drake','Lirien','Gunnar',
  'Ottilie','Brand','Vesper','Casimir','Niamh','Aldous','Elowen','Stirling',
  'Ilmari','Rowena','Cato','Brynn','Emric','Solange','Tor','Adaeze',
];

function randomName() {
  return RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
}

const NAME_STYLES = {
  nordic: {
    label: '⚔️ Nordic',
    // Parts: [onset syllables, optional middle, closing syllables]
    // Names are built as: onset + (sometimes middle) + closing
    onset:  ['Rag','Bjorn','Sig','Thor','Freya','Ulf','Hild','Gunnar','Leif','Astrid','Eirik','Ragn','Hjalm','Orm','Sven','Aud','Dag','Val','Ing','Rolf','Haakon','Ivar','Brand','Rune','Skald','Vidar'],
    mid:    ['ar','un','ald','if','in','ul','om','an'],
    end:    ['nar','ald','mund','ulfr','hild','borg','varr','dís','björn','frið','leikr','inn','stein','vald','laug','arr'],
  },
  elvish: {
    label: '🌿 Elvish',
    onset:  ['Aer','Syl','Thal','Elan','Aear','Lúth','Gal','Cal','Tari','Ael','Nín','Aran','Silv','Eäl','Fae','Nim','Eir','Aiel','Lór','Nael'],
    mid:    ['ia','ae','el','or','ith','an','in','al'],
    end:    ['iel','ael','ith','wen','dor','riel','nil','thien','rian','ssë','lor','vel','mir','nar','dil','ssiel'],
  },
  dwarven: {
    label: '🪨 Dwarven',
    onset:  ['Dur','Bur','Grun','Tor','Bram','Kaz','Thur','Morg','Druk','Beld','Grum','Thar','Durin','Bofri','Dor','Gimb','Nori','Glor','Thorin','Bal'],
    mid:    ['um','or','ar','un','in','ak','ur'],
    end:    ['din','gar','mar','grim','dum','dok','rik','bek','dal','kar','bur','dim','dur','gar','kin'],
  },
  orcish: {
    label: '💀 Orcish',
    onset:  ['Gruk','Krag','Urk','Bog','Skrag','Gash','Mog','Thruk','Krul','Vog','Dreg','Gorr','Skul','Bruk','Kruk','Zog','Urg','Trog','Mag','Rak'],
    mid:    ['ak','ug','ag','uk','og'],
    end:    ['ash','uk','nak','gash','rak','tar','gul','bok','dak','gor','zug','mak'],
  },
  human: {
    label: '🏛️ Human',
    onset:  ['Mar','Del','Car','Ter','Al','Bel','Cor','Dar','Fen','Gar','Har','Jer','Kel','Lan','Mat','Nat','Per','Ros','Ser','Tav','Var','Wil','Xan','Yor','Zan','Pell','Renn','Sard','Torm'],
    mid:    ['a','e','i','o','an','er','al','en','el'],
    end:    ['an','en','on','ith','ia','us','is','or','ar','in','ic','ix','ius','ine','os','in','ald','and','ell'],
  },
  celtic: {
    label: '🍀 Celtic',
    onset:  ['Bri','Caer','Mor','Eira','Cae','Rhian','Gwen','Deir','Aoife','Fionn','Ciar','Muir','Sear','Niamh','Caol','Bran','Conn','Cunn','Diarm','Feargh'],
    mid:    ['an','wyn','och','ach','dach','ith','ech'],
    end:    ['wyn','aer','an','ach','dach','dwyn','ith','wyn','on','awn','each','och','wyn','ell','ach'],
  },
  eastern: {
    label: '🌙 Eastern',
    onset:  ['Zar','Sha','Kas','Mir','Nar','Tal','Yaz','Bal','Dar','Far','Jas','Kha','Las','Mas','Nas','Par','Ras','Sal','Taj','Var'],
    mid:    ['i','a','u','al','an','im','am','ir'],
    end:    ['ira','ana','ari','im','al','ur','in','ul','an','em','eel','amin','ira','azar','in'],
  },
};

function _pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function generateStyledName(styleKey) {
  const s = NAME_STYLES[styleKey];
  if (!s) return randomName();
  const onset = _pick(s.onset);
  // ~40% chance of a middle syllable, but only if onset is short
  const useMid = s.mid && Math.random() < 0.4 && onset.length <= 4;
  const mid = useMid ? _pick(s.mid) : '';
  const end = _pick(s.end);
  // Avoid awkward double-vowel or double-consonant joins
  let raw = onset + mid + end;
  // Capitalise and deduplicate obvious repeats (e.g. "Sigennar" → keep; "Tharrar" → trim one r)
  raw = raw.charAt(0).toUpperCase() + raw.slice(1);
  // Trim accidental triple-same-letter
  raw = raw.replace(/(.)\1{2,}/g, '$1$1');
  return raw;
}

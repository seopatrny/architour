/* Player-name rules shared by the game and the server.
 * Keeps names short and school-appropriate. */
(function (root) {
  // Blocked anywhere inside a name (after un-leetspeaking and squashing repeats)
  const BLOCK_ANYWHERE = [
    'fuck', 'shit', 'cunt', 'bitch', 'nigg', 'niga', 'fag', 'dick', 'pussy', 'penis', 'vagina',
    'porn', 'slut', 'whore', 'nazi', 'hitler', 'kkk', 'boob', 'tits', 'bastard', 'retard', 'wank',
    'jizz', 'dildo', 'asshole', 'ashole', 'piss', 'damn', 'sexy', 'stfu', 'wtf',
  ];
  // Blocked only as a whole word
  const BLOCK_WORD = [
    'ass', 'butt', 'poop', 'pee', 'fart', 'hell', 'cum', 'anal', 'tit', 'sex', 'gay', 'kill', 'die', 'dead',
    'loser', 'stupid', 'idiot', 'dumb', 'hate', 'suck', 'sucks', 'nerd', 'ugly', 'fat', 'admin', 'teacher',
    'fuk', 'rape', 'crap', 'kys', 'arse', 'sht', 'fck', 'cock',
  ];
  const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', '@': 'a', $: 's', '!': 'i' };

  function normalize(str) {
    return String(str || '')
      .toLowerCase()
      .replace(/[013457@$!8]/g, (c) => LEET[c] || c);
  }

  function isClean(name) {
    const n = normalize(name);
    const letters = n.replace(/[^a-z]/g, '');
    const squashed = letters.replace(/(.)\1+/g, '$1');
    if (BLOCK_ANYWHERE.some((w) => letters.includes(w) || squashed.includes(w))) return false;
    const words = n.split(/[^a-z]+/).filter(Boolean);
    if (words.some((w) => BLOCK_WORD.includes(w) || BLOCK_WORD.includes(w.replace(/(.)\1+/g, '$1')))) return false;
    return true;
  }

  /* Returns { ok, name, key, reason } */
  function check(raw) {
    const name = String(raw || '').replace(/\s+/g, ' ').trim();
    if (name.length < 2) return { ok: false, reason: 'Name needs at least 2 letters.' };
    if (name.length > 14) return { ok: false, reason: 'Name can be 14 characters max.' };
    if (!/^[A-Za-z0-9 .'-]+$/.test(name)) return { ok: false, reason: 'Use only letters, numbers and spaces.' };
    if (!/[A-Za-z]/.test(name)) return { ok: false, reason: 'Name needs some letters.' };
    if (!isClean(name)) return { ok: false, reason: "Let's pick a different name!" };
    return { ok: true, name, key: keyOf(name) };
  }

  function keyOf(name) {
    return String(name || '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  const api = { check, keyOf, isClean };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Names = api;
})(typeof window !== 'undefined' ? window : globalThis);

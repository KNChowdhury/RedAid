// Loose name matching across Bangla and English spellings, so "Rahim" finds
// "রহিম" and "মোহাম্মদ" finds "Mohammad". Both sides are reduced to a rough
// consonant skeleton: Bangla letters become Latin, then vowels, 'h' and
// doubled letters are dropped and similar sounds merged. Good enough to pick
// a person out of a short list; never use it for anything that must be exact.

const BN_TO_LATIN: Record<string, string> = {
  'ক': 'k', 'খ': 'k', 'গ': 'g', 'ঘ': 'g', 'ঙ': 'ng', 'চ': 'c', 'ছ': 'c', 'জ': 'j', 'ঝ': 'j', 'ঞ': 'n',
  'ট': 't', 'ঠ': 't', 'ড': 'd', 'ঢ': 'd', 'ণ': 'n', 'ত': 't', 'থ': 't', 'দ': 'd', 'ধ': 'd', 'ন': 'n',
  'প': 'p', 'ফ': 'f', 'ব': 'b', 'ভ': 'b', 'ম': 'm', 'য': 'j', 'র': 'r', 'ল': 'l', 'শ': 's', 'ষ': 's',
  'স': 's', 'হ': 'h', 'ড়': 'r', 'ঢ়': 'r', 'য়': 'y', 'ৎ': 't', 'ং': 'ng', 'ক্ষ': 'k'
};

function skeleton(word: string): string {
  let latin = '';
  for (const ch of word.normalize('NFC').toLowerCase()) {
    latin += BN_TO_LATIN[ch] ?? (/[a-z]/.test(ch) ? ch : '');
  }
  return latin
    .replace(/ch/g, 'c').replace(/sh/g, 's').replace(/ph/g, 'f')
    .replace(/z/g, 'j').replace(/v/g, 'b').replace(/q/g, 'k').replace(/x/g, 'ks').replace(/w/g, '')
    .replace(/[aeiouyh]/g, '')
    .replace(/(.)\1+/g, '$1');
}

/** True when every word of the query appears in the name, as typed or by sound. */
export function nameMatches(name: string, query: string): boolean {
  const plainName = name.toLowerCase().replace(/\s+/g, ' ');
  const nameSkeleton = plainName.split(' ').map(skeleton).join(' ');
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every(tok => {
      if (plainName.includes(tok)) return true;
      const sk = skeleton(tok);
      return sk.length >= 2 && nameSkeleton.includes(sk);
    });
}

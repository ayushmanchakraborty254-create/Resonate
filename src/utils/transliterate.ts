/**
 * Phonetic Transliteration Engine for Indic Scripts (Devanagari / Hindi & Bengali)
 * Transliterates native script into clean, readable Romanized English (Hinglish / Banglish)
 * while preserving exact punctuation, spacing, and time-sync tags.
 */

const DEVANAGARI_VOWELS: Record<string, string> = {
  'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo', 'ऋ': 'ri',
  'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au', 'अं': 'an', 'अः': 'ah'
};

const DEVANAGARI_MATRAS: Record<string, string> = {
  'ा': 'aa', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo', 'ृ': 'ri',
  'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ं': 'n', 'ँ': 'n', 'ः': 'h',
  'ॅ': 'e', 'ॉ': 'o'
};

const DEVANAGARI_CONSONANTS: Record<string, string> = {
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
  'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
  'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
  'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',
  'क़': 'q', 'ख़': 'kh', 'ग़': 'gh', 'ज़': 'z', 'ड़': 'd', 'ढ़': 'dh', 'फ़': 'f'
};

const BENGALI_VOWELS: Record<string, string> = {
  'অ': 'o', 'আ': 'aa', 'ই': 'i', 'ঈ': 'ee', 'উ': 'u', 'ঊ': 'oo', 'ঋ': 'ri',
  'এ': 'e', 'ঐ': 'oi', 'ও': 'o', 'ঔ': 'ou'
};

const BENGALI_MATRAS: Record<string, string> = {
  'া': 'aa', 'ি': 'i', 'ী': 'ee', 'ু': 'u', 'ূ': 'oo', 'ৃ': 'ri',
  'ে': 'e', 'ৈ': 'oi', 'ো': 'o', 'ৌ': 'ou', 'ং': 'ng', 'ঃ': 'h', 'ঁ': 'n'
};

const BENGALI_CONSONANTS: Record<string, string> = {
  'ক': 'k', 'খ': 'kh', 'গ': 'g', 'ঘ': 'gh', 'ঙ': 'ng',
  'চ': 'ch', 'ছ': 'chh', 'জ': 'j', 'ঝ': 'jh', 'ঞ': 'ny',
  'ট': 't', 'ঠ': 'th', 'ড': 'd', 'ঢ': 'dh', 'ণ': 'n',
  'ত': 't', 'থ': 'th', 'দ': 'd', 'ধ': 'dh', 'ন': 'n',
  'প': 'p', 'ফ': 'ph', 'ব': 'b', 'ভ': 'bh', 'ম': 'm',
  'য': 'j', 'র': 'r', 'ল': 'l', 'শ': 'sh', 'ষ': 'sh', 'স': 's', 'হ': 'h',
  'ড়': 'r', 'ঢ়': 'rh', 'য়': 'y', 'ৎ': 't'
};

export function hasIndicScript(text: string): boolean {
  return /[\u0900-\u097F\u0980-\u09FF]/.test(text);
}

export function transliterateToRomanized(text: string): string {
  if (!text || !hasIndicScript(text)) return text;

  let out = '';
  const len = text.length;

  for (let i = 0; i < len; i++) {
    const ch = text[i];
    const code = ch.charCodeAt(0);

    // Devanagari range: \u0900 to \u097F
    if (code >= 0x0900 && code <= 0x097F) {
      if (DEVANAGARI_VOWELS[ch]) {
        out += DEVANAGARI_VOWELS[ch];
      } else if (DEVANAGARI_CONSONANTS[ch]) {
        const base = DEVANAGARI_CONSONANTS[ch];
        const next = i + 1 < len ? text[i + 1] : '';
        // If next is virama (्), suppress inherent 'a'
        if (next === '्') {
          out += base;
          i++; // skip virama
        } else if (DEVANAGARI_MATRAS[next]) {
          out += base + DEVANAGARI_MATRAS[next];
          i++; // skip matra
        } else {
          // Default inherent vowel 'a'
          out += base + 'a';
        }
      } else if (DEVANAGARI_MATRAS[ch]) {
        out += DEVANAGARI_MATRAS[ch];
      } else if (ch === '्') {
        // standalone virama, skip
      } else if (ch === '।' || ch === '॥') {
        out += '.';
      } else {
        out += ch;
      }
      continue;
    }

    // Bengali range: \u0980 to \u09FF
    if (code >= 0x0980 && code <= 0x09FF) {
      if (BENGALI_VOWELS[ch]) {
        out += BENGALI_VOWELS[ch];
      } else if (BENGALI_CONSONANTS[ch]) {
        const base = BENGALI_CONSONANTS[ch];
        const next = i + 1 < len ? text[i + 1] : '';
        // If next is hasant (্), suppress inherent 'o'
        if (next === '্') {
          out += base;
          i++; // skip hasant
        } else if (BENGALI_MATRAS[next]) {
          out += base + BENGALI_MATRAS[next];
          i++; // skip matra
        } else {
          out += base + 'o';
        }
      } else if (BENGALI_MATRAS[ch]) {
        out += BENGALI_MATRAS[ch];
      } else if (ch === '্') {
        // standalone hasant, skip
      } else if (ch === '।' || ch === '॥') {
        out += '.';
      } else {
        out += ch;
      }
      continue;
    }

    out += ch;
  }

  // Clean double 'aa' or redundant 'ao' at word ends for natural Hinglish reading
  return out
    .replace(/aa+/g, 'a')
    .replace(/ee+/g, 'i')
    .replace(/oo+/g, 'u')
    .replace(/\b([a-z]+)a\b/g, (match, p1) => {
      // Avoid stripping short words like 'ka', 'na', 'ya', 'aa'
      if (match.length <= 2) return match;
      // In Hindi/Urdu, words ending in inherent 'a' sound consonant-final (e.g. 'janama' -> 'janam')
      return p1;
    });
}


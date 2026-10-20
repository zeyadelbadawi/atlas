/**
 * Search text normalisation shared by the index build and the browser, so a
 * query and the indexed text are folded the same way.
 *
 * Arabic: diacritics (tashkeel) and tatweel removed; أ إ آ ٱ → ا, ى → ي,
 * ة → ه, ؤ → و, ئ → ي; Arabic-Indic and Persian digits → ASCII. A token that
 * starts with the article "ال" is also indexed without it ("الدورات" →
 * "دورات"). Latin: lowercase, accents removed.
 */
const STOPWORDS = new Set([
  // English
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'can', 'do', 'for', 'from', 'how', 'i', 'if', 'in', 'is',
  'it', 'its', 'my', 'of', 'on', 'or', 'so', 'that', 'the', 'their', 'then', 'this', 'to', 'was', 'what',
  'when', 'where', 'which', 'who', 'will', 'with', 'you', 'your',
  // Arabic (normalised forms)
  'في', 'من', 'علي', 'الي', 'عن', 'مع', 'او', 'ان', 'هو', 'هي', 'دي', 'ده', 'اللي', 'الذي', 'التي', 'كل',
  'لو', 'لما', 'ازاي', 'ايه', 'هل', 'بس', 'كمان', 'عشان', 'لكن', 'ثم', 'بعد', 'قبل', 'هذا', 'هذه', 'ذلك', 'انت',
]);

export function normalizeText(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .replace(/[\u064B-\u065F]|\u0670|\u0640|[\u06D6-\u06ED]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

/** Words of a text, normalised, without stopwords; Arabic "ال" forms add the bare word. */
export function tokenize(input: string): string[] {
  const words = normalizeText(input).match(/[\p{L}\p{N}]+/gu) ?? [];
  const out: string[] = [];
  for (const word of words) {
    if (word.length < 2 || STOPWORDS.has(word)) continue;
    out.push(word);
    if (word.startsWith('ال') && word.length >= 5) out.push(word.slice(2));
  }
  return out;
}

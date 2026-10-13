/**
 * Strips HTML tags, script, style blocks and returns clean plaintext.
 */
export function extractPlainText(html: string): string {
  if (!html) return '';

  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Counts words cleanly.
 */
export function wordCount(text: string): number {
  if (!text) return 0;
  const words = text.trim().match(/[\p{L}\p{N}'’-]+/gu);
  return words ? words.length : 0;
}

/**
 * Counts sentences.
 */
export function sentenceCount(text: string): number {
  if (!text) return 0;
  const sentences = text.trim().match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g);
  return sentences ? sentences.length : 1;
}

/**
 * Estimates syllables in an English word.
 */
export function countSyllables(word: string): number {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!clean) return 0;
  if (clean.length <= 3) return 1;

  const modified = clean
    .replace(/(?:[^laeiouy]|ed|es|e)$/, '')
    .replace(/^y/, '');
  const matches = modified.match(/[aeiouy]{1,2}/g);
  return matches ? Math.max(1, matches.length) : 1;
}

/**
 * Total syllables across all words.
 */
export function totalSyllables(text: string): number {
  const words = text.match(/[a-zA-Z]+/g) || [];
  let count = 0;
  for (const w of words) {
    count += countSyllables(w);
  }
  return count;
}

/**
 * Flesch Reading Ease (0 to 100, higher is easier).
 * 90-100: Very Easy, 60-70: Standard, 0-30: Very Difficult.
 */
export function fleschReadingEase(text: string): number {
  const words = wordCount(text);
  const sentences = sentenceCount(text);
  const syllables = totalSyllables(text);

  if (words === 0 || sentences === 0) return 0;

  const score = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
  return Math.min(100, Math.max(0, Math.round(score * 10) / 10));
}

/**
 * Flesch-Kincaid Grade Level (corresponds to US school grade).
 */
export function fleschKincaidGrade(text: string): number {
  const words = wordCount(text);
  const sentences = sentenceCount(text);
  const syllables = totalSyllables(text);

  if (words === 0 || sentences === 0) return 0;

  const grade = 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59;
  return Math.max(0, Math.round(grade * 10) / 10);
}

/**
 * Gunning Fog Index (estimates years of formal education needed).
 */
export function gunningFog(text: string): number {
  const words = text.match(/[a-zA-Z]+/g) || [];
  const sentences = sentenceCount(text);
  if (words.length === 0 || sentences === 0) return 0;

  let complexWords = 0;
  for (const w of words) {
    if (countSyllables(w) >= 3) {
      complexWords++;
    }
  }

  const score = 0.4 * (words.length / sentences + 100 * (complexWords / words.length));
  return Math.max(0, Math.round(score * 10) / 10);
}

/**
 * Coleman-Liau Index (character and word based).
 */
export function colemanLiau(text: string): number {
  const words = wordCount(text);
  const sentences = sentenceCount(text);
  if (words === 0 || sentences === 0) return 0;

  const letters = (text.match(/[\p{L}\p{N}]/gu) || []).length;
  const L = (letters / words) * 100;
  const S = (sentences / words) * 100;

  const score = 0.0588 * L - 0.296 * S - 15.8;
  return Math.max(0, Math.round(score * 10) / 10);
}

/**
 * SMOG Readability Index.
 */
export function smogIndex(text: string): number {
  const sentences = sentenceCount(text);
  const words = text.match(/[a-zA-Z]+/g) || [];
  if (sentences === 0 || words.length === 0) return 0;

  let polysyllables = 0;
  for (const w of words) {
    if (countSyllables(w) >= 3) {
      polysyllables++;
    }
  }

  const score = 1.043 * Math.sqrt(polysyllables * (30 / sentences)) + 3.1291;
  return Math.max(0, Math.round(score * 10) / 10);
}

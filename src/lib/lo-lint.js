// @ts-check
/**
 * Learning Outcome (LO) linting and language detection.
 * Provides quality checks for learning outcome text including vague verb detection.
 * @module lib/lo-lint
 */

/**
 * Normalizes text by collapsing whitespace and trimming.
 *
 * @param {string} text - Text to normalize
 * @returns {string} Normalized text
 * @private
 */
function normalise(text) {
  return (text ?? "").toString().normalize("NFKC").replace(/\s+/g, " ").trim();
}

/**
 * Tokenizes text into lowercase words for analysis.
 *
 * @param {string} text - Text to tokenize
 * @returns {string[]} Array of lowercase tokens
 * @private
 */
function tokenize(text) {
  return normalise(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Counts how many tokens match a set of stopwords.
 *
 * @param {string[]} tokens - Tokens to check
 * @param {Set<string>} stopwordsSet - Set of stopwords to match against
 * @returns {number} Count of matching tokens
 * @private
 */
function countMatches(tokens, stopwordsSet) {
  let score = 0;
  for (const t of tokens) {
    if (stopwordsSet.has(t)) {
      score++;
    }
  }
  return score;
}

// ---------- language detection (heuristic) ----------
/** Stopwords by language for heuristic language detection */
export const LANGUAGE_STOPWORDS = {
  en: new Set([
    "the",
    "and",
    "to",
    "of",
    "in",
    "for",
    "with",
    "on",
    "by",
    "as",
    "from",
    "that",
    "this",
    "these",
    "those",
    "will",
    "can",
    "be",
    "is",
    "are",
    "an",
    "a",
    "at",
    "or",
    "into",
    "using",
  ]),
  ga: new Set([
    "agus",
    "an",
    "na",
    "ar",
    "le",
    "go",
    "i",
    "is",
    "ní",
    "mar",
    "don",
    "do",
    "seo",
    "sin",
    "atá",
    "bhfuil",
  ]),
  fr: new Set([
    "le",
    "la",
    "les",
    "et",
    "de",
    "des",
    "du",
    "un",
    "une",
    "dans",
    "pour",
    "avec",
    "sur",
    "par",
    "est",
    "être",
    "au",
  ]),
  es: new Set([
    "el",
    "la",
    "los",
    "las",
    "y",
    "de",
    "del",
    "un",
    "una",
    "en",
    "para",
    "con",
    "por",
    "es",
    "ser",
    "al",
    "que",
  ]),
  de: new Set([
    "der",
    "die",
    "das",
    "und",
    "zu",
    "von",
    "mit",
    "für",
    "im",
    "auf",
    "ist",
    "sein",
    "eine",
    "ein",
    "den",
    "dem",
  ]),
};

/**
 * Detects the language of text using stopword frequency heuristics.
 *
 * @param {string} text - Text to analyze
 * @param {Object} [options] - Detection options
 * @param {number} [options.minTokens=6] - Minimum tokens required for detection
 * @returns {{lang: string, confidence: number, scores: Object}} Detection result
 */
export function detectLanguage(text, { minTokens = 6 } = {}) {
  const tokens = tokenize(text);
  if (tokens.length < minTokens) {
    return { lang: "unknown", confidence: 0, scores: {} };
  }

  /** @type {Record<string, number>} */
  const scores = {};
  for (const [lang, sw] of Object.entries(LANGUAGE_STOPWORDS)) {
    scores[lang] = countMatches(tokens, sw);
  }

  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [bestLang, bestScore] = ranked[0] || ["unknown", 0];
  const secondScore = ranked[1]?.[1] ?? 0;

  const confidence = bestScore === 0 ? 0 : (bestScore - secondScore) / Math.max(1, tokens.length);

  if (bestScore < 2) {
    return { lang: "unknown", confidence: 0, scores };
  }

  return { lang: bestLang, confidence, scores };
}

// ---------- LO wording lint ----------
/** Lint rules for detecting vague or non-measurable language in learning outcomes */
export const LO_LINT_RULES = [
  {
    id: "vague_understand",
    severity: "warn",
    pattern: /\b(understand|understands|understanding)\b/gi,
    message: "'Understand' is hard to assess directly. Use an observable verb instead.",
    suggestions: ["describe", "explain", "apply", "analyse", "evaluate"],
  },
  {
    id: "vague_knowledge",
    severity: "warn",
    pattern: /\b(have knowledge of|has knowledge of|knowledge of|be knowledgeable about)\b/gi,
    message: "Vague knowledge phrasing. Prefer a demonstrable action.",
    suggestions: ["identify", "summarise", "compare", "apply", "justify"],
  },
  {
    id: "vague_familiar",
    severity: "warn",
    pattern: /\b(be familiar with|become familiar with|familiar with)\b/gi,
    message: "'Familiar with' is usually not measurable. State what learners will *do*.",
    suggestions: ["use", "select", "demonstrate", "interpret"],
  },
  {
    id: "vague_aware",
    severity: "warn",
    pattern: /\b(aware of|awareness of)\b/gi,
    message: "'Aware of' is often too soft. Specify the behaviour or output.",
    suggestions: ["recognise", "identify", "explain", "evaluate"],
  },
];

/**
 * Lints a single learning outcome for quality issues.
 * Checks for vague verbs, language consistency, and measurability.
 *
 * @param {string} text - Learning outcome text to lint
 * @param {Object} [opts] - Linting options
 * @param {string} [opts.expectedLanguage="en"] - Expected language code
 * @param {boolean} [opts.allowUnknownLanguage=true] - Allow unknown language without warning
 * @param {Object} [opts.language] - Language detection options
 * @returns {{issues: any[], language: Object}} Lint result with issues and language detection
 */
export function lintLearningOutcome(text, opts = {}) {
  const t = normalise(text);
  /** @type {any[]} */
  const issues = [];

  if (!t) {
    return { issues, language: { lang: "unknown", confidence: 0, scores: {} } };
  }

  const language = detectLanguage(t, opts.language || undefined);

  const expected = (opts.expectedLanguage || "en").toLowerCase();
  const allowUnknown = opts.allowUnknownLanguage ?? true;

  if (language.lang !== "unknown") {
    if (language.lang !== expected) {
      issues.push({
        id: "language_mismatch",
        severity: "warn",
        start: 0,
        end: 0,
        match: "",
        message: `Detected language looks like "${language.lang}" (expected "${expected}").`,
        suggestions: [],
      });
    }
  } else if (!allowUnknown) {
    issues.push({
      id: "language_unknown",
      severity: "info",
      start: 0,
      end: 0,
      match: "",
      message: "Could not detect language reliably (short text).",
      suggestions: [],
    });
  }

  for (const rule of LO_LINT_RULES) {
    rule.pattern.lastIndex = 0;
    let m;
    while ((m = rule.pattern.exec(t)) !== null) {
      issues.push({
        id: rule.id,
        severity: rule.severity,
        start: m.index,
        end: m.index + m[0].length,
        match: m[0],
        message: rule.message,
        suggestions: rule.suggestions ?? [],
      });
      if (m.index === rule.pattern.lastIndex) {
        rule.pattern.lastIndex++;
      }
    }
  }

  return { issues, language };
}

/**
 * Lints multiple learning outcomes.
 *
 * @param {string[]} outcomes - Array of learning outcome texts
 * @param {Object} [opts] - Linting options (passed to lintLearningOutcome)
 * @returns {Array<{index: number, text: string, issues: any[], language: Object}>} Array of lint results
 */
export function lintLearningOutcomes(outcomes, opts = {}) {
  return (outcomes ?? []).map((loText, idx) => ({
    index: idx,
    text: loText,
    ...lintLearningOutcome(loText, opts),
  }));
}

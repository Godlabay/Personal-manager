/**
 * Lightweight bilingual (French / English) date parser for QuickAdd.
 *
 * Input: a raw user string like "Finir le rapport demain 9h #urgent"
 * Output: { title: "Finir le rapport", dueAt: Date|null, hasTime: boolean, priority: 1..4, labels: string[] }
 *
 * Strategy — run each detector in order; first match wins. The detector returns
 * the match range so we can strip it from the title afterwards.
 *
 * Rules of thumb:
 *  - We prefer false-negative (no date detected) over false-positive (wrong date).
 *  - Priorities come from `!!`, `!!!`, `!!!!` or `p1..p4` (Todoist compat).
 *  - Labels come from `#label` or `@label` (both accepted).
 */

export interface ParsedQuickAdd {
  title: string;
  dueAt: Date | null;
  hasTime: boolean;
  priority: 1 | 2 | 3 | 4;
  labels: string[];
}

interface DateMatch {
  date: Date;
  hasTime: boolean;
  /** Inclusive start index in the original string. */
  start: number;
  /** Exclusive end index. */
  end: number;
}

const WEEKDAYS_FR: Record<string, number> = {
  dimanche: 0, lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6,
};
const WEEKDAYS_EN: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
};

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

/** Append HH:MM time to a date. */
function withTime(base: Date, hours: number, minutes: number): Date {
  const c = new Date(base);
  c.setHours(hours, minutes, 0, 0);
  return c;
}

/** Parse "9h", "9h30", "14:00", "2:30 pm", "2pm" — returns [hour, minute] or null. */
function parseTimeToken(token: string): [number, number] | null {
  const t = token.trim().toLowerCase();
  // French "9h", "9h30"
  const fr = /^(\d{1,2})h(\d{0,2})$/i.exec(t);
  if (fr) {
    const h = parseInt(fr[1], 10);
    const m = fr[2] ? parseInt(fr[2], 10) : 0;
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return [h, m];
  }
  // 24h HH:MM
  const h24 = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (h24) {
    const h = parseInt(h24[1], 10);
    const m = parseInt(h24[2], 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return [h, m];
  }
  // 12h with am/pm
  const ampm = /^(\d{1,2})(?::(\d{2}))?\s?(am|pm)$/i.exec(t);
  if (ampm) {
    let h = parseInt(ampm[1], 10);
    const m = ampm[2] ? parseInt(ampm[2], 10) : 0;
    const isPm = ampm[3].toLowerCase() === 'pm';
    if (h === 12) h = isPm ? 12 : 0;
    else if (isPm) h += 12;
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return [h, m];
  }
  return null;
}

/** Look for a time token anywhere after `from` in `text`. Returns match or null. */
function findTime(text: string, from: number): { hours: number; minutes: number; start: number; end: number } | null {
  // Match things like "9h", "9h30", "14:00", "2pm", "2:30 pm"
  const re = /\b(\d{1,2}h\d{0,2}|\d{1,2}:\d{2}|\d{1,2}(?::\d{2})?\s?(?:am|pm))\b/gi;
  re.lastIndex = from;
  const m = re.exec(text);
  if (!m) return null;
  const t = parseTimeToken(m[1]);
  if (!t) return null;
  return { hours: t[0], minutes: t[1], start: m.index, end: m.index + m[0].length };
}

/**
 * 1. Keywords: today/tomorrow/tonight & aujourd'hui/demain/ce soir/après-demain
 */
function detectKeywords(text: string, now: Date): DateMatch | null {
  const lower = text.toLowerCase();
  const patterns: Array<{ re: RegExp; offset: number; defaultHour?: number }> = [
    { re: /\b(aujourd'?hui|today)\b/i, offset: 0 },
    { re: /\b(demain|tomorrow)\b/i, offset: 1 },
    { re: /\b(apr[èe]s[\s-]?demain|day after tomorrow)\b/i, offset: 2 },
    { re: /\b(ce soir|tonight)\b/i, offset: 0, defaultHour: 20 },
    { re: /\b(ce matin|this morning)\b/i, offset: 0, defaultHour: 9 },
  ];
  for (const p of patterns) {
    const m = p.re.exec(lower);
    if (!m) continue;
    const base = startOfDay(now);
    base.setDate(base.getDate() + p.offset);
    const t = findTime(text, m.index + m[0].length);
    const date = t ? withTime(base, t.hours, t.minutes) : p.defaultHour != null ? withTime(base, p.defaultHour, 0) : base;
    return {
      date,
      hasTime: !!t || p.defaultHour != null,
      start: m.index,
      end: t ? t.end : m.index + m[0].length,
    };
  }
  return null;
}

/**
 * 2. "dans N jours" / "in N days" / "in N weeks"
 */
function detectInN(text: string, now: Date): DateMatch | null {
  const re = /\b(?:dans|in)\s+(\d+)\s+(jours?|days?|semaines?|weeks?|mois|months?)\b/i;
  const m = re.exec(text);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const unit = m[2].toLowerCase();
  const base = startOfDay(now);
  if (/semain|week/.test(unit)) base.setDate(base.getDate() + n * 7);
  else if (/mois|month/.test(unit)) base.setMonth(base.getMonth() + n);
  else base.setDate(base.getDate() + n);
  const t = findTime(text, m.index + m[0].length);
  return {
    date: t ? withTime(base, t.hours, t.minutes) : base,
    hasTime: !!t,
    start: m.index,
    end: t ? t.end : m.index + m[0].length,
  };
}

/**
 * 3. Weekday: "lundi", "vendredi prochain", "next friday", "this monday".
 */
function detectWeekday(text: string, now: Date): DateMatch | null {
  const re = /\b(ce|cette|next|this)?\s*(dimanche|lundi|mardi|mercredi|jeudi|vendredi|samedi|sunday|monday|tuesday|wednesday|thursday|friday|saturday)(?:\s+(prochain|next))?\b/i;
  const m = re.exec(text);
  if (!m) return null;
  const day = m[2].toLowerCase();
  const wd = WEEKDAYS_FR[day] ?? WEEKDAYS_EN[day];
  if (wd == null) return null;
  const forceNext = /prochain|next/i.test(m[1] ?? '') || /prochain|next/i.test(m[3] ?? '');
  const base = startOfDay(now);
  let delta = (wd - base.getDay() + 7) % 7;
  if (delta === 0) delta = 7; // "monday" on a monday → next monday
  if (forceNext && delta < 7) delta += 0; // already correct
  base.setDate(base.getDate() + delta);
  const t = findTime(text, m.index + m[0].length);
  return {
    date: t ? withTime(base, t.hours, t.minutes) : base,
    hasTime: !!t,
    start: m.index,
    end: t ? t.end : m.index + m[0].length,
  };
}

/**
 * 4. Numeric: "15/04", "15/04/2026", "2026-04-15".
 */
function detectNumeric(text: string, now: Date): DateMatch | null {
  // ISO YYYY-MM-DD
  const iso = /\b(\d{4})-(\d{2})-(\d{2})\b/.exec(text);
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    const t = findTime(text, iso.index + iso[0].length);
    return {
      date: t ? withTime(d, t.hours, t.minutes) : d,
      hasTime: !!t,
      start: iso.index,
      end: t ? t.end : iso.index + iso[0].length,
    };
  }
  // DD/MM or DD/MM/YYYY (Euro order — assume FR context; EN users usually type ISO)
  const dm = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/.exec(text);
  if (dm) {
    const day = parseInt(dm[1], 10);
    const month = parseInt(dm[2], 10) - 1;
    let year = dm[3] ? parseInt(dm[3], 10) : now.getFullYear();
    if (year < 100) year += 2000;
    if (month < 0 || month > 11 || day < 1 || day > 31) return null;
    const d = new Date(year, month, day);
    // If the date is already past this year and no year given, bump to next year.
    if (!dm[3] && d < startOfDay(now)) d.setFullYear(year + 1);
    const t = findTime(text, dm.index + dm[0].length);
    return {
      date: t ? withTime(d, t.hours, t.minutes) : d,
      hasTime: !!t,
      start: dm.index,
      end: t ? t.end : dm.index + dm[0].length,
    };
  }
  return null;
}

/**
 * Strip the match out of the input string, collapsing whitespace.
 */
function stripRange(s: string, start: number, end: number): string {
  return (s.slice(0, start) + ' ' + s.slice(end)).replace(/\s+/g, ' ').trim();
}

function extractPriority(text: string): { text: string; priority: 1 | 2 | 3 | 4 } {
  let priority: 1 | 2 | 3 | 4 = 1;
  let cleaned = text;
  // Todoist-style p1..p4 (p1 is highest)
  const pMatch = /(^|\s)p([1-4])(\s|$)/i.exec(cleaned);
  if (pMatch) {
    const p = parseInt(pMatch[2], 10);
    // Invert: Todoist p1 (highest) → our priority 4.
    priority = (5 - p) as 1 | 2 | 3 | 4;
    cleaned = cleaned.replace(pMatch[0], ' ');
  } else {
    // "!!!!" (urgent), "!!!", "!!"
    const bangs = /(^|\s)(!{2,4})(\s|$)/.exec(cleaned);
    if (bangs) {
      const count = bangs[2].length;
      const mapped = Math.min(4, Math.max(2, count)) as 2 | 3 | 4;
      priority = mapped;
      cleaned = cleaned.replace(bangs[0], ' ');
    }
  }
  return { text: cleaned.replace(/\s+/g, ' ').trim(), priority };
}

function extractLabels(text: string): { text: string; labels: string[] } {
  const labels: string[] = [];
  const cleaned = text.replace(/(?:^|\s)[#@]([\p{L}\p{N}_-]+)/gu, (_m, label) => {
    labels.push(label);
    return ' ';
  });
  return { text: cleaned.replace(/\s+/g, ' ').trim(), labels };
}

/**
 * Main entry point.
 */
export function parseQuickAdd(input: string, now: Date = new Date()): ParsedQuickAdd {
  let working = input.trim();

  const detectors = [detectKeywords, detectInN, detectWeekday, detectNumeric];
  let match: DateMatch | null = null;
  for (const d of detectors) {
    match = d(working, now);
    if (match) break;
  }

  if (match) {
    working = stripRange(working, match.start, match.end);
  }

  const afterPriority = extractPriority(working);
  const afterLabels = extractLabels(afterPriority.text);

  return {
    title: afterLabels.text,
    dueAt: match?.date ?? null,
    hasTime: match?.hasTime ?? false,
    priority: afterPriority.priority,
    labels: afterLabels.labels,
  };
}

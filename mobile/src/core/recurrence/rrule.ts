/**
 * RRULE subset for Personal Manager — Phase 2.
 *
 * Supported:
 *  - FREQ: DAILY | WEEKLY | MONTHLY
 *  - INTERVAL (default 1)
 *  - BYDAY (weekly only): MO,TU,WE,TH,FR,SA,SU
 *  - BYMONTHDAY (monthly only): 1..31
 *  - COUNT: stop after N occurrences
 *  - UNTIL: stop on/after ISO date
 *
 * Not supported (deferred): BYSETPOS, BYMONTH, nested rules, RRULE sets.
 *
 * Format: we store the rule as a single line string (RFC 5545 RRULE fragment
 * without the leading "RRULE:"), e.g.:
 *   FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR
 *   FREQ=DAILY;INTERVAL=2;COUNT=10
 *   FREQ=MONTHLY;BYMONTHDAY=15
 */

export interface ParsedRRule {
  freq: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  interval: number;
  byday?: Array<'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU'>;
  bymonthday?: number[];
  count?: number;
  until?: Date;
}

const WD_TO_IDX: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
const IDX_TO_WD = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const;

export function parseRRule(rule: string): ParsedRRule | null {
  if (!rule) return null;
  const parts = new Map<string, string>();
  for (const pair of rule.split(';')) {
    const [k, v] = pair.split('=');
    if (k && v) parts.set(k.toUpperCase(), v);
  }
  const freq = parts.get('FREQ');
  if (freq !== 'DAILY' && freq !== 'WEEKLY' && freq !== 'MONTHLY') return null;

  const out: ParsedRRule = { freq, interval: 1 };
  if (parts.has('INTERVAL')) out.interval = Math.max(1, parseInt(parts.get('INTERVAL')!, 10) || 1);
  if (parts.has('BYDAY')) {
    out.byday = parts.get('BYDAY')!
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter((s): s is ParsedRRule['byday'] extends (infer U)[] | undefined ? U : never =>
        s === 'MO' || s === 'TU' || s === 'WE' || s === 'TH' || s === 'FR' || s === 'SA' || s === 'SU');
  }
  if (parts.has('BYMONTHDAY')) {
    out.bymonthday = parts.get('BYMONTHDAY')!
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => n >= 1 && n <= 31);
  }
  if (parts.has('COUNT')) out.count = parseInt(parts.get('COUNT')!, 10);
  if (parts.has('UNTIL')) out.until = parseUntil(parts.get('UNTIL')!);
  return out;
}

export function formatRRule(r: ParsedRRule): string {
  const parts = [`FREQ=${r.freq}`];
  if (r.interval && r.interval !== 1) parts.push(`INTERVAL=${r.interval}`);
  if (r.byday?.length) parts.push(`BYDAY=${r.byday.join(',')}`);
  if (r.bymonthday?.length) parts.push(`BYMONTHDAY=${r.bymonthday.join(',')}`);
  if (r.count != null) parts.push(`COUNT=${r.count}`);
  if (r.until) parts.push(`UNTIL=${formatUntil(r.until)}`);
  return parts.join(';');
}

function parseUntil(s: string): Date | undefined {
  // Accept YYYYMMDD or YYYYMMDDTHHmmssZ (RFC 5545) or full ISO.
  const compact = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})Z?)?$/.exec(s);
  if (compact) {
    const [, y, m, d, hh, mm, ss] = compact;
    return new Date(Date.UTC(+y, +m - 1, +d, +(hh ?? 0), +(mm ?? 0), +(ss ?? 0)));
  }
  const iso = new Date(s);
  return Number.isNaN(iso.getTime()) ? undefined : iso;
}

function formatUntil(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

/**
 * Compute the next occurrence strictly after `from`, using the parsed rule.
 * Returns null when the rule has been exhausted (COUNT / UNTIL).
 *
 * `completedCount` is the number of times this task has already fired —
 * used to honour COUNT. Pass 0 for the first call.
 */
export function nextOccurrence(
  rule: ParsedRRule,
  from: Date,
  completedCount = 0,
): Date | null {
  if (rule.count != null && completedCount + 1 >= rule.count) return null;

  let candidate: Date;
  const base = new Date(from);

  if (rule.freq === 'DAILY') {
    candidate = new Date(base);
    candidate.setDate(candidate.getDate() + rule.interval);
  } else if (rule.freq === 'WEEKLY') {
    if (rule.byday?.length) {
      const allowed = new Set(rule.byday.map((d) => WD_TO_IDX[d]));
      candidate = new Date(base);
      candidate.setDate(candidate.getDate() + 1);
      // Walk forward; when we cross a week boundary, skip (interval-1) weeks.
      let weeksCrossed = 0;
      const startWeek = weekStart(base);
      for (let i = 0; i < 366; i++) {
        const w = weekStart(candidate);
        if (w.getTime() !== startWeek.getTime()) weeksCrossed++;
        if (weeksCrossed > 0 && (weeksCrossed - 1) % rule.interval !== 0) {
          candidate.setDate(candidate.getDate() + 1);
          continue;
        }
        if (allowed.has(candidate.getDay())) break;
        candidate.setDate(candidate.getDate() + 1);
      }
    } else {
      candidate = new Date(base);
      candidate.setDate(candidate.getDate() + 7 * rule.interval);
    }
  } else {
    // MONTHLY
    candidate = new Date(base);
    if (rule.bymonthday?.length) {
      const days = [...rule.bymonthday].sort((a, b) => a - b);
      // Find the next candidate day in the same month that's > current day.
      const d = candidate.getDate();
      const nextInSameMonth = days.find((x) => x > d);
      if (nextInSameMonth && monthHasDay(candidate, nextInSameMonth)) {
        candidate.setDate(nextInSameMonth);
      } else {
        candidate.setMonth(candidate.getMonth() + rule.interval, days[0]);
        while (!monthHasDay(candidate, days[0])) {
          candidate.setMonth(candidate.getMonth() + 1);
        }
      }
    } else {
      candidate.setMonth(candidate.getMonth() + rule.interval);
    }
  }

  if (rule.until && candidate > rule.until) return null;
  return candidate;
}

function weekStart(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  c.setDate(c.getDate() - c.getDay());
  return c;
}

function monthHasDay(d: Date, day: number): boolean {
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return day <= last;
}

/**
 * Human-readable summary for UI chips ("Every Mon/Wed/Fri", "Monthly on the 15th").
 */
export function humanizeRRule(ruleStr: string, locale: 'fr' | 'en' = 'fr'): string {
  const r = parseRRule(ruleStr);
  if (!r) return '';
  const FR = { daily: 'jour', weekly: 'semaine', monthly: 'mois', every: 'Chaque', on: 'les' };
  const EN = { daily: 'day', weekly: 'week', monthly: 'month', every: 'Every', on: 'on' };
  const L = locale === 'en' ? EN : FR;

  if (r.freq === 'DAILY') {
    return r.interval === 1 ? (locale === 'en' ? 'Daily' : 'Chaque jour') : `${L.every} ${r.interval} ${L.daily}`;
  }
  if (r.freq === 'WEEKLY') {
    if (r.byday?.length) {
      const days = locale === 'en'
        ? { MO: 'Mon', TU: 'Tue', WE: 'Wed', TH: 'Thu', FR: 'Fri', SA: 'Sat', SU: 'Sun' }
        : { MO: 'lun', TU: 'mar', WE: 'mer', TH: 'jeu', FR: 'ven', SA: 'sam', SU: 'dim' };
      return `${L.on} ${r.byday.map((d) => days[d]).join(', ')}`;
    }
    return r.interval === 1 ? (locale === 'en' ? 'Weekly' : 'Chaque semaine') : `${L.every} ${r.interval} ${L.weekly}`;
  }
  if (r.bymonthday?.length) {
    return locale === 'en' ? `Monthly on the ${r.bymonthday.join(', ')}` : `Chaque mois le ${r.bymonthday.join(', ')}`;
  }
  return r.interval === 1 ? (locale === 'en' ? 'Monthly' : 'Chaque mois') : `${L.every} ${r.interval} ${L.monthly}`;
}

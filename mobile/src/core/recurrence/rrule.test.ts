import { formatRRule, humanizeRRule, nextOccurrence, parseRRule } from './rrule';

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);

describe('parseRRule', () => {
  test('simple daily', () => {
    const r = parseRRule('FREQ=DAILY');
    expect(r?.freq).toBe('DAILY');
    expect(r?.interval).toBe(1);
  });

  test('weekly with BYDAY', () => {
    const r = parseRRule('FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE,FR');
    expect(r?.freq).toBe('WEEKLY');
    expect(r?.interval).toBe(2);
    expect(r?.byday).toEqual(['MO', 'WE', 'FR']);
  });

  test('monthly with BYMONTHDAY', () => {
    const r = parseRRule('FREQ=MONTHLY;BYMONTHDAY=1,15');
    expect(r?.bymonthday).toEqual([1, 15]);
  });

  test('rejects unsupported FREQ', () => {
    expect(parseRRule('FREQ=YEARLY')).toBeNull();
  });
});

describe('nextOccurrence — daily', () => {
  test('every day', () => {
    const r = parseRRule('FREQ=DAILY')!;
    expect(nextOccurrence(r, d(2026, 4, 14))).toEqual(d(2026, 4, 15));
  });
  test('every 3 days', () => {
    const r = parseRRule('FREQ=DAILY;INTERVAL=3')!;
    expect(nextOccurrence(r, d(2026, 4, 14))).toEqual(d(2026, 4, 17));
  });
});

describe('nextOccurrence — weekly', () => {
  test('every monday', () => {
    const r = parseRRule('FREQ=WEEKLY;BYDAY=MO')!;
    // Tue 14 Apr 2026 → next Mon = Mon 20 Apr
    expect(nextOccurrence(r, d(2026, 4, 14))).toEqual(d(2026, 4, 20));
  });
  test('mon/wed/fri — from Tue', () => {
    const r = parseRRule('FREQ=WEEKLY;BYDAY=MO,WE,FR')!;
    // Tue 14 → next Wed 15
    expect(nextOccurrence(r, d(2026, 4, 14))).toEqual(d(2026, 4, 15));
  });
  test('mon/wed/fri — from Fri', () => {
    const r = parseRRule('FREQ=WEEKLY;BYDAY=MO,WE,FR')!;
    // Fri 17 → next Mon 20
    expect(nextOccurrence(r, d(2026, 4, 17))).toEqual(d(2026, 4, 20));
  });
});

describe('nextOccurrence — monthly', () => {
  test('every month (no byday)', () => {
    const r = parseRRule('FREQ=MONTHLY')!;
    expect(nextOccurrence(r, d(2026, 4, 14))).toEqual(d(2026, 5, 14));
  });
  test('on the 15th — from the 10th', () => {
    const r = parseRRule('FREQ=MONTHLY;BYMONTHDAY=15')!;
    expect(nextOccurrence(r, d(2026, 4, 10))).toEqual(d(2026, 4, 15));
  });
  test('on the 15th — from the 20th rolls to next month', () => {
    const r = parseRRule('FREQ=MONTHLY;BYMONTHDAY=15')!;
    expect(nextOccurrence(r, d(2026, 4, 20))).toEqual(d(2026, 5, 15));
  });
});

describe('COUNT & UNTIL', () => {
  test('COUNT exhaustion returns null', () => {
    const r = parseRRule('FREQ=DAILY;COUNT=3')!;
    // completed 2 times → next is the 3rd which is allowed
    expect(nextOccurrence(r, d(2026, 4, 14), 1)).toEqual(d(2026, 4, 15));
    // completed 3 times → null
    expect(nextOccurrence(r, d(2026, 4, 14), 2)).toBeNull();
  });
  test('UNTIL past returns null', () => {
    const r = parseRRule('FREQ=DAILY;UNTIL=20260101')!;
    expect(nextOccurrence(r, d(2026, 4, 14))).toBeNull();
  });
});

describe('format round-trip', () => {
  test('preserves semantics', () => {
    const r = parseRRule('FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE')!;
    const formatted = formatRRule(r);
    expect(parseRRule(formatted)).toEqual(r);
  });
});

describe('humanize', () => {
  test('french daily', () => {
    expect(humanizeRRule('FREQ=DAILY', 'fr')).toBe('Chaque jour');
  });
  test('french weekly byday', () => {
    expect(humanizeRRule('FREQ=WEEKLY;BYDAY=MO,WE,FR', 'fr')).toBe('les lun, mer, ven');
  });
  test('english monthly byday', () => {
    expect(humanizeRRule('FREQ=MONTHLY;BYMONTHDAY=15', 'en')).toBe('Monthly on the 15');
  });
});

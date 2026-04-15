import { parseQuickAdd } from './dateParser';

const NOW = new Date(2026, 3, 14, 10, 0); // Tuesday 14 April 2026, 10:00

function d(y: number, m: number, day: number, h = 0, min = 0): Date {
  return new Date(y, m - 1, day, h, min, 0, 0);
}

describe('parseQuickAdd', () => {
  test('keyword: demain', () => {
    const r = parseQuickAdd('Sortir les poubelles demain', NOW);
    expect(r.title).toBe('Sortir les poubelles');
    expect(r.dueAt).toEqual(d(2026, 4, 15));
    expect(r.hasTime).toBe(false);
  });

  test('keyword: demain 9h', () => {
    const r = parseQuickAdd('Appel médecin demain 9h', NOW);
    expect(r.title).toBe('Appel médecin');
    expect(r.dueAt).toEqual(d(2026, 4, 15, 9, 0));
    expect(r.hasTime).toBe(true);
  });

  test('keyword: tomorrow 2pm', () => {
    const r = parseQuickAdd('Call mom tomorrow 2pm', NOW);
    expect(r.title).toBe('Call mom');
    expect(r.dueAt).toEqual(d(2026, 4, 15, 14, 0));
    expect(r.hasTime).toBe(true);
  });

  test('keyword: tonight defaults 20h', () => {
    const r = parseQuickAdd('Dîner tonight', NOW);
    expect(r.dueAt).toEqual(d(2026, 4, 14, 20, 0));
    expect(r.hasTime).toBe(true);
  });

  test('in N days', () => {
    const r = parseQuickAdd('Rapport dans 3 jours', NOW);
    expect(r.title).toBe('Rapport');
    expect(r.dueAt).toEqual(d(2026, 4, 17));
  });

  test('in 2 weeks', () => {
    const r = parseQuickAdd('Quarterly review in 2 weeks', NOW);
    expect(r.dueAt).toEqual(d(2026, 4, 28));
  });

  test('weekday: vendredi prochain', () => {
    // Tue 14 → vendredi prochain = Fri 17
    const r = parseQuickAdd('Budget vendredi prochain', NOW);
    expect(r.dueAt).toEqual(d(2026, 4, 17));
  });

  test('weekday: next monday', () => {
    const r = parseQuickAdd('Standup next monday 10h', NOW);
    expect(r.dueAt).toEqual(d(2026, 4, 20, 10, 0));
  });

  test('numeric: 15/04', () => {
    const r = parseQuickAdd('Anniversaire maman 15/04', NOW);
    expect(r.dueAt).toEqual(d(2026, 4, 15));
  });

  test('iso: 2026-05-01', () => {
    const r = parseQuickAdd('Deadline 2026-05-01', NOW);
    expect(r.dueAt).toEqual(d(2026, 5, 1));
  });

  test('priority bangs', () => {
    const r = parseQuickAdd('Payer facture !!!', NOW);
    expect(r.title).toBe('Payer facture');
    expect(r.priority).toBe(3);
  });

  test('priority p1 is highest', () => {
    const r = parseQuickAdd('Urgent bug p1', NOW);
    expect(r.priority).toBe(4);
  });

  test('labels', () => {
    const r = parseQuickAdd('Relire PR #work @review', NOW);
    expect(r.title).toBe('Relire PR');
    expect(r.labels).toEqual(['work', 'review']);
  });

  test('no date → null', () => {
    const r = parseQuickAdd('Acheter du pain', NOW);
    expect(r.dueAt).toBeNull();
    expect(r.title).toBe('Acheter du pain');
  });
});

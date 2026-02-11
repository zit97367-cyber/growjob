export function getUtcWeekStart(input = new Date()): Date {
  const d = new Date(input);
  const utcDay = d.getUTCDay();
  const daysFromMonday = (utcDay + 6) % 7;
  const weekStart = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0),
  );
  weekStart.setUTCDate(weekStart.getUTCDate() - daysFromMonday);
  return weekStart;
}

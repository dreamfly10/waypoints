export function addMonthsISO(dateISO: string, months: number): string {
  const d = new Date(dateISO);
  if (Number.isNaN(d.getTime())) return dateISO;
  const next = new Date(d);
  next.setMonth(next.getMonth() + months);
  return next.toISOString();
}

export function isFutureDate(dateISO: string): boolean {
  const d = new Date(dateISO);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  return d.getTime() > today.getTime();
}


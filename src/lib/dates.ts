// Datas são tratadas no fuso local do aparelho, como "AAAA-MM-DD".

export const WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function dayKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  r.setDate(r.getDate() + n);
  return r;
}

export function startOfWeek(d: Date, weekStartsOn: number): Date {
  const diff = (d.getDay() - weekStartsOn + 7) % 7;
  return addDays(d, -diff);
}

/** Dias seguidos com estudo, terminando hoje (ou ontem, se hoje ainda não houve estudo). */
export function dayStreak(days: Set<string>, today = new Date()): number {
  let cursor = days.has(dayKey(today)) ? today : addDays(today, -1);
  let count = 0;
  while (days.has(dayKey(cursor))) {
    count++;
    cursor = addDays(cursor, -1);
  }
  return count;
}

/** Semanas seguidas com pelo menos um dia de estudo (a semana atual conta se já houve estudo). */
export function weekStreak(days: Set<string>, weekStartsOn: number, today = new Date()): number {
  const hasStudyInWeek = (start: Date) => {
    for (let i = 0; i < 7; i++) if (days.has(dayKey(addDays(start, i)))) return true;
    return false;
  };
  let week = startOfWeek(today, weekStartsOn);
  if (!hasStudyInWeek(week)) week = addDays(week, -7);
  let count = 0;
  while (hasStudyInWeek(week)) {
    count++;
    week = addDays(week, -7);
  }
  return count;
}

/** Grade do mês (semanas completas), incluindo dias dos meses vizinhos. */
export function monthGrid(year: number, month: number, weekStartsOn: number): Date[] {
  const first = new Date(year, month, 1);
  const start = startOfWeek(first, weekStartsOn);
  const last = new Date(year, month + 1, 0);
  const cells: Date[] = [];
  for (let d = start; d <= last || cells.length % 7 !== 0; d = addDays(d, 1)) cells.push(d);
  return cells;
}

/** Maior sequência de dias seguidos com estudo. */
export function longestDayStreak(days: Set<string>): number {
  let best = 0;
  for (const d of days) {
    const date = new Date(`${d}T00:00`);
    if (days.has(dayKey(addDays(date, -1)))) continue; // só conta a partir do início de cada sequência
    let n = 1;
    while (days.has(dayKey(addDays(date, n)))) n++;
    best = Math.max(best, n);
  }
  return best;
}

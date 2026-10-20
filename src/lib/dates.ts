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

/** Pausa máxima (dias sem estudo) que ainda mantém a sequência de estudos. */
export const MAX_PAUSE_DAYS = 3;

const DAY_MS = 86_400_000;
const daysBetween = (a: string, b: string) =>
  Math.round((new Date(`${b}T00:00`).getTime() - new Date(`${a}T00:00`).getTime()) / DAY_MS);

/** Quebra a lista ordenada de dias de estudo em sequências (pausas de até MAX_PAUSE_DAYS não quebram). */
function studyRuns(days: Set<string>): string[][] {
  const sorted = [...days].sort();
  const runs: string[][] = [];
  for (const d of sorted) {
    const run = runs.at(-1);
    if (run && daysBetween(run.at(-1)!, d) - 1 <= MAX_PAUSE_DAYS) run.push(d);
    else runs.push([d]);
  }
  return runs;
}

/** Estudos seguidos: dias de estudo na sequência atual (zera após mais de MAX_PAUSE_DAYS dias sem estudar). */
export function studyStreak(days: Set<string>, today = new Date()): number {
  const last = studyRuns(days).at(-1);
  if (!last) return 0;
  // O dia de hoje ainda não acabou: só conta como pausa a partir de amanhã.
  return daysBetween(last.at(-1)!, dayKey(today)) - 1 <= MAX_PAUSE_DAYS ? last.length : 0;
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

/** Maior sequência de estudos já feita (mesma regra de pausa). */
export function longestStudyStreak(days: Set<string>): number {
  return Math.max(0, ...studyRuns(days).map((r) => r.length));
}

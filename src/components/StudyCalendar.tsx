"use client";

import { useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { MONTHS, WEEKDAYS_SHORT, dayKey, monthGrid } from "@/lib/dates";
import styles from "./StudyCalendar.module.css";

type Props = {
  /** Dias com estudo, no formato AAAA-MM-DD. */
  studiedDays: Set<string>;
  weekStartsOn?: number;
  selected?: string | null;
  onSelect?: (day: string) => void;
};

export function StudyCalendar({ studiedDays, weekStartsOn = 0, selected, onSelect }: Props) {
  const today = new Date();
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const cells = useMemo(
    () => monthGrid(view.year, view.month, weekStartsOn),
    [view, weekStartsOn],
  );
  const todayKey = dayKey(today);
  const weekdays = Array.from({ length: 7 }, (_, i) => WEEKDAYS_SHORT[(i + weekStartsOn) % 7]);

  const shift = (n: number) =>
    setView(({ year, month }) => {
      const d = new Date(year, month + n, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  return (
    <div className={styles.calendar}>
      <div className={styles.header}>
        <button className={styles.nav} onClick={() => shift(-1)} aria-label="Mês anterior">
          <ChevronLeft size={18} />
        </button>
        <span className={styles.title}>
          {MONTHS[view.month]} {view.year}
        </span>
        <button className={styles.nav} onClick={() => shift(1)} aria-label="Próximo mês">
          <ChevronRight size={18} />
        </button>
      </div>

      <div className={styles.grid}>
        {weekdays.map((w) => (
          <span key={w} className={styles.weekday}>
            {w}
          </span>
        ))}
        {cells.map((d) => {
          const key = dayKey(d);
          const studied = studiedDays.has(key);
          const outside = d.getMonth() !== view.month;
          const future = key > todayKey;
          const cls = [
            styles.day,
            studied && styles.studied,
            key === todayKey && styles.today,
            key === selected && styles.selected,
            (outside || future) && styles.muted,
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              key={key}
              type="button"
              className={cls}
              disabled={future}
              onClick={() => onSelect?.(key)}
              aria-label={`${d.getDate()}${studied ? ", estudou" : ""}`}
            >
              {studied ? <Check size={16} strokeWidth={3} /> : d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

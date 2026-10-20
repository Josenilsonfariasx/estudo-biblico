"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { CheckCircle2, ChevronLeft, ChevronRight, Sprout } from "lucide-react";
import { Empty, Field, Loading, PageHeader, useAutosave } from "@/components/ui";
import { addDays, dayKey, startOfWeek } from "@/lib/dates";
import { local } from "@/lib/local-db";
import { chapterLabel, usePlan, useProfile } from "@/lib/plan";
import { reviewId, saveNote, saveReview } from "@/lib/store";
import type { Review } from "@/lib/types";
import styles from "./review.module.css";

const fmt = (d: Date) => d.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });

export function ReviewView() {
  const params = useSearchParams();
  const router = useRouter();
  const profile = useProfile();
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => setToday(new Date()), []);

  const weekStart = params.get("semana") ?? (today ? dayKey(startOfWeek(today, profile.weekStartsOn)) : "");
  const review = useLiveQuery(async () => (weekStart ? ((await local.reviews.get(reviewId(weekStart))) ?? null) : undefined), [weekStart]);
  const notes = useLiveQuery(() => local.notes.toArray());
  const plan = usePlan();

  const startDate = useMemo(() => (weekStart ? new Date(`${weekStart}T00:00`) : null), [weekStart]);
  const weekDays = useMemo(
    () => (startDate ? new Set(Array.from({ length: 7 }, (_, i) => dayKey(addDays(startDate, i)))) : new Set<string>()),
    [startDate],
  );

  if (!today || !startDate || review === undefined || !notes || !plan) return <Loading />;

  const noteMap = new Map(notes.map((n) => [n.chapterId, n]));
  const readThisWeek = plan.tracks
    .flatMap((t) => t.chapters)
    .filter((c) => c.readAt && weekDays.has(dayKey(new Date(c.readAt))))
    .sort((a, b) => a.readAt!.localeCompare(b.readAt!));
  const go = (days: number) => router.replace(`/revisao?semana=${dayKey(addDays(startDate, days))}`);
  const isCurrent = weekStart === dayKey(startOfWeek(today, profile.weekStartsOn));

  return (
    <>
      <PageHeader back title="Revisão semanal" subtitle={`${fmt(startDate)} – ${fmt(addDays(startDate, 6))}`} />
      <div className="row">
        <button className="btn small secondary" onClick={() => go(-7)}>
          <ChevronLeft size={16} /> Anterior
        </button>
        <span className="grow" />
        {!isCurrent && (
          <button className="btn small secondary" onClick={() => go(7)}>
            Próxima <ChevronRight size={16} />
          </button>
        )}
      </div>

      <h2 className="section-title">Anotações da semana</h2>
      {readThisWeek.length ? (
        readThisWeek.map((c) => {
          const note = noteMap.get(c.id);
          return (
            <article key={c.id} className={`card ${styles.item}`}>
              <div className="row">
                <Link href={`/capitulo?id=${encodeURIComponent(c.id)}`} className="grow">
                  <h3>{chapterLabel(c)}</h3>
                </Link>
                <button
                  className={`badge ${note?.isSeed ? "seed" : ""}`}
                  onClick={() => saveNote(c.id, { isSeed: !note?.isSeed })}
                  aria-pressed={!!note?.isSeed}
                >
                  <Sprout size={14} /> {note?.isSeed ? "Semente" : "Marcar semente"}
                </button>
              </div>
              {note?.verse && <p className="verse">“{note.verse}”</p>}
              {note?.summary && <p>{note.summary}</p>}
              {note?.learned && (
                <p className="soft">
                  <strong>Aprendi:</strong> {note.learned}
                </p>
              )}
              {!note?.verse && !note?.summary && !note?.learned && <p className="soft">Sem anotação.</p>}
            </article>
          );
        })
      ) : (
        <Empty>Nenhum capítulo lido nesta semana.</Empty>
      )}

      <ReviewForm key={weekStart} weekStart={weekStart} initial={review} />
    </>
  );
}

function ReviewForm({ weekStart, initial }: { weekStart: string; initial: Review | null }) {
  const [fields, setFields] = useState({
    verse: initial?.verse ?? "",
    verseRef: initial?.verseRef ?? "",
    reflection: initial?.reflection ?? "",
  });
  const save = useAutosave(fields, (f) => saveReview(weekStart, f));
  const set = (p: Partial<typeof fields>) => {
    const next = { ...fields, ...p };
    setFields(next);
    save(next);
  };
  const completedAt = initial?.completedAt;

  return (
    <section className="card gold-card stack">
      <h2>Versículo da semana</h2>
      <Field label="Versículo" value={fields.verse} onChange={(verse) => set({ verse })} rows={2} />
      <Field single label="Referência" value={fields.verseRef} onChange={(verseRef) => set({ verseRef })} placeholder="ex.: João 15:5" />
      <Field label="Reflexão da semana" value={fields.reflection} onChange={(reflection) => set({ reflection })} rows={3} />
      {completedAt ? (
        <div className="row">
          <CheckCircle2 size={20} style={{ color: "var(--success)" }} />
          <span className="grow">Concluída em {new Date(completedAt).toLocaleDateString("pt-BR")}</span>
          <button className="btn small secondary" onClick={() => saveReview(weekStart, { ...fields, completedAt: null })}>
            Reabrir
          </button>
        </div>
      ) : (
        <button className="btn" onClick={() => saveReview(weekStart, { ...fields, completedAt: new Date().toISOString() })}>
          <CheckCircle2 size={18} /> Concluir revisão
        </button>
      )}
    </section>
  );
}

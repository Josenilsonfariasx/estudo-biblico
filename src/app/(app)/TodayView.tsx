"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { BookOpen, CalendarDays, ChevronRight, CloudOff, Flame } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { LampIcon } from "@/components/LampIcon";
import { StudyCalendar } from "@/components/StudyCalendar";
import { Loading, ReadCheck } from "@/components/ui";
import { addDays, dayKey, dayStreak, startOfWeek, weekStreak } from "@/lib/dates";
import { local } from "@/lib/local-db";
import { chapterLabel, usePlan, useProfile, useStudiedDays } from "@/lib/plan";
import { reviewId, setRead } from "@/lib/store";
import { useSyncStatus } from "@/lib/sync-client";
import styles from "./today.module.css";

function greeting(hour: number) {
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export function TodayView() {
  // Datas dependem do fuso do aparelho: só renderiza depois de montar no cliente.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const plan = usePlan();
  const profile = useProfile();
  const studiedDays = useStudiedDays();
  const sync = useSyncStatus();
  const weekStart = now ? dayKey(startOfWeek(now, profile.weekStartsOn)) : "";
  const review = useLiveQuery(() => (weekStart ? local.reviews.get(reviewId(weekStart)) : undefined), [weekStart]);

  const dayChapters = useMemo(() => {
    if (!plan || !selectedDay) return [];
    return plan.tracks
      .flatMap((t) => t.chapters)
      .filter((c) => c.readAt && dayKey(new Date(c.readAt)) === selectedDay);
  }, [plan, selectedDay]);

  if (!now || !plan || !studiedDays) return <Loading />;

  if (!plan.tracks.length) {
    return (
      <Loading
        text={
          sync.state === "offline"
            ? "Sem conexão. Abra o app com internet uma vez para baixar seu plano."
            : "Baixando seu plano de estudos…"
        }
      />
    );
  }

  const monthPrefix = dayKey(now).slice(0, 7);
  const studiedThisMonth = [...studiedDays].filter((d) => d.startsWith(monthPrefix)).length;
  const daysThisWeek = Array.from({ length: 7 }, (_, i) => dayKey(addDays(new Date(weekStart + "T00:00"), i))).filter(
    (d) => studiedDays.has(d),
  ).length;
  const suggestReview = !review?.completedAt && daysThisWeek >= 3;
  const main = plan.tracks.find((t) => t.next);
  const firstName = profile.displayName.split(" ")[0];

  return (
    <>
      <header className={styles.header}>
        <div>
          <p className="soft">
            {greeting(now.getHours())}
            {firstName && `, ${firstName}`}
          </p>
          <h1>Hoje</h1>
        </div>
        <div className="row">
          {(sync.state === "offline" || sync.pending > 0) && (
            <span className="soft" title="Alterações aguardando conexão">
              <CloudOff size={18} />
            </span>
          )}
          <Link href="/mais" aria-label="Perfil">
            <Avatar photo={profile.photo} />
          </Link>
        </div>
      </header>

      <section className={`card gold-card ${styles.verseCard}`}>
        <LampIcon size={20} className={styles.verseIcon} />
        {review?.verse ? (
          <>
            <p className="verse">“{review.verse}”</p>
            <p className="soft">{review.verseRef || "Versículo da semana"}</p>
          </>
        ) : (
          <>
            <p className="verse">“Lâmpada para os meus pés é a tua palavra, e luz para o meu caminho.”</p>
            <p className="soft">Salmos 119:105</p>
          </>
        )}
      </section>

      <section className={`card ${styles.next}`}>
        <h2>Próxima leitura</h2>
        {plan.tracks.map((t) =>
          t.next ? (
            <Link key={t.track.id} href={`/capitulo?id=${encodeURIComponent(t.next.id)}`} className={styles.nextRow}>
              <ReadCheck checked={false} label={`Marcar ${chapterLabel(t.next)} como lido`} onChange={() => setRead(t.next!.id, true)} />
              <span className="grow">
                <strong>{chapterLabel(t.next)}</strong>
                <span className="soft">
                  {" "}
                  · {t.track.name}
                  {t.next.page && ` · pág. ${t.next.page}`}
                </span>
              </span>
              <ChevronRight size={18} className="soft" />
            </Link>
          ) : (
            <p key={t.track.id} className="soft">
              {t.track.name}: tudo lido! Adicione novos blocos no Plano.
            </p>
          ),
        )}
        {main?.next && (
          <Link className="btn" href={`/capitulo?id=${encodeURIComponent(main.next.id)}&encontro=1`}>
            Começar encontro
          </Link>
        )}
      </section>

      {suggestReview && (
        <Link href="/revisao" className={`card ${styles.reviewHint}`}>
          <CalendarDays size={20} />
          <span className="grow">
            <strong>Hora da revisão semanal</strong>
            <span className="soft"> · você estudou {daysThisWeek} dias nesta semana</span>
          </span>
          <ChevronRight size={18} />
        </Link>
      )}

      <section className={styles.stats}>
        <div className={`card ${styles.stat}`}>
          <Flame size={18} />
          <strong>{dayStreak(studiedDays, now)}</strong>
          <span className="soft">dias seguidos</span>
        </div>
        <div className={`card ${styles.stat}`}>
          <CalendarDays size={18} />
          <strong>{weekStreak(studiedDays, profile.weekStartsOn, now)}</strong>
          <span className="soft">semanas seguidas</span>
        </div>
        <div className={`card ${styles.stat}`}>
          <BookOpen size={18} />
          <strong>{studiedThisMonth}</strong>
          <span className="soft">dias no mês</span>
        </div>
      </section>

      <section className="card stack">
        <StudyCalendar
          studiedDays={studiedDays}
          weekStartsOn={profile.weekStartsOn}
          selected={selectedDay}
          onSelect={(d) => setSelectedDay(d === selectedDay ? null : d)}
        />
        {selectedDay && (
          <div className={styles.dayList}>
            {dayChapters.length ? (
              dayChapters.map((c) => (
                <Link key={c.id} href={`/capitulo?id=${encodeURIComponent(c.id)}`} className="row">
                  <span className="grow">{chapterLabel(c)}</span>
                  <ChevronRight size={16} className="soft" />
                </Link>
              ))
            ) : (
              <p className="soft">Nenhum capítulo marcado neste dia.</p>
            )}
          </div>
        )}
      </section>
    </>
  );
}

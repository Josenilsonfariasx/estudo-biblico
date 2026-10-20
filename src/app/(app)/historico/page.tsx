"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronRight, NotebookPen, Sprout } from "lucide-react";
import { Empty, Loading, PageHeader } from "@/components/ui";
import { dayKey } from "@/lib/dates";
import { local } from "@/lib/local-db";
import { chapterLabel, hasContent, usePlan } from "@/lib/plan";

export default function HistoricoPage() {
  const plan = usePlan();
  const notes = useLiveQuery(() => local.notes.toArray());
  if (!plan || !notes) return <Loading />;

  const noteMap = new Map(notes.map((n) => [n.chapterId, n]));
  const read = plan.tracks
    .flatMap((t) => t.chapters.map((c) => ({ c, track: t.track.name })))
    .filter(({ c }) => c.readAt)
    .sort((a, b) => b.c.readAt!.localeCompare(a.c.readAt!));

  const byDay = new Map<string, typeof read>();
  for (const item of read) {
    const key = dayKey(new Date(item.c.readAt!));
    byDay.set(key, [...(byDay.get(key) ?? []), item]);
  }

  return (
    <>
      <PageHeader back="/mais" title="Histórico" subtitle={`${read.length} capítulos lidos`} />
      {!read.length && <Empty>Nenhum capítulo lido ainda.</Empty>}
      {[...byDay].map(([day, items]) => (
        <section key={day} className="stack">
          <h2 className="section-title">
            {new Date(`${day}T00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </h2>
          <div className="list">
            {items.map(({ c, track }) => {
              const note = noteMap.get(c.id);
              return (
                <Link key={c.id} href={`/capitulo?id=${encodeURIComponent(c.id)}`}>
                  <span className="grow">
                    {chapterLabel(c)} <span className="soft">· {track}</span>
                  </span>
                  {note?.isSeed && <Sprout size={16} className="seed" />}
                  {hasContent(note) && !note?.isSeed && <NotebookPen size={16} className="soft" />}
                  <ChevronRight size={16} className="soft" />
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}

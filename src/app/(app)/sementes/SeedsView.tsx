"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronRight, Megaphone, Plus, Search, Sprout } from "lucide-react";
import { Empty, Loading, PageHeader, Segmented } from "@/components/ui";
import { local } from "@/lib/local-db";
import { STATUS_LABEL, chapterLabel, usePlan } from "@/lib/plan";
import { createMessage } from "@/lib/store";
import styles from "./seeds.module.css";

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export function SeedsView() {
  const router = useRouter();
  const params = useSearchParams();
  const [tab, setTab] = useState<"seeds" | "messages">(params.get("aba") === "mensagens" ? "messages" : "seeds");
  const [query, setQuery] = useState("");
  const plan = usePlan();
  const notes = useLiveQuery(() => local.notes.toArray());
  const messages = useLiveQuery(() => local.messages.toArray());

  if (!plan || !notes || !messages) return <Loading />;

  const q = normalize(query.trim());
  const match = (...texts: string[]) => !q || normalize(texts.join(" ")).includes(q);

  const seeds = notes
    .filter((n) => n.isSeed && !n.deletedAt)
    .map((n) => {
      const info = plan.chapterInfo.get(n.chapterId);
      const chapter = info && plan.tracks.flatMap((t) => t.chapters).find((c) => c.id === n.chapterId);
      return { note: n, reference: chapter ? chapterLabel(chapter) : "Capítulo removido" };
    })
    .filter(({ note, reference }) => match(reference, note.seedIdea, note.verse, note.summary, note.learned))
    .sort((a, b) => b.note.modifiedAt.localeCompare(a.note.modifiedAt));
  const messagesFromNote = new Map(messages.filter((m) => !m.deletedAt && m.noteId).map((m) => [m.noteId!, m]));

  const msgs = messages
    .filter((m) => !m.deletedAt)
    .filter((m) => match(m.title, m.baseText, m.centralIdea, m.points))
    .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));

  const toMessage = async (from?: Parameters<typeof createMessage>[0]) => {
    const id = await createMessage(from);
    router.push(`/mensagem?id=${id}`);
  };

  return (
    <>
      <PageHeader title="Sementes" subtitle="O que guardei para uma mensagem" />
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "seeds", label: `Sementes (${notes.filter((n) => n.isSeed && !n.deletedAt).length})` },
          { value: "messages", label: `Mensagens (${messages.filter((m) => !m.deletedAt).length})` },
        ]}
      />
      <label className={styles.search}>
        <Search size={18} />
        <input type="search" placeholder="Buscar" value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>

      {tab === "seeds" ? (
        seeds.length ? (
          seeds.map(({ note, reference }) => {
            const existing = messagesFromNote.get(note.id);
            return (
              <article key={note.id} className={`card ${styles.seed}`}>
                <div className="row">
                  <Sprout size={18} className="seed" />
                  <Link href={`/capitulo?id=${encodeURIComponent(note.chapterId)}`} className="grow">
                    <h3>{reference}</h3>
                  </Link>
                </div>
                {note.seedIdea && <p>{note.seedIdea}</p>}
                {note.verse && <p className="verse soft">“{note.verse}”</p>}
                {existing ? (
                  <Link href={`/mensagem?id=${existing.id}`} className="btn small secondary">
                    <Megaphone size={16} /> Ver mensagem ({STATUS_LABEL[existing.status]})
                  </Link>
                ) : (
                  <button className="btn small" onClick={() => toMessage({ note, reference })}>
                    <Megaphone size={16} /> Virar mensagem
                  </button>
                )}
              </article>
            );
          })
        ) : (
          <Empty>
            {q
              ? "Nenhuma semente encontrada."
              : "Nenhuma semente ainda. Na anotação de um capítulo, marque “Semente para mensagem?”."}
          </Empty>
        )
      ) : (
        <>
          <button className="btn secondary" onClick={() => toMessage()}>
            <Plus size={18} /> Nova mensagem
          </button>
          {msgs.length ? (
            <div className="list">
              {msgs.map((m) => (
                <Link key={m.id} href={`/mensagem?id=${m.id}`}>
                  <span className="grow">
                    <strong className={styles.msgTitle}>{m.title || "Sem título"}</strong>
                    <span className="soft">{m.baseText || "Sem texto base"}</span>
                  </span>
                  <span className={`badge ${m.status === "preached" ? styles.preached : ""}`}>{STATUS_LABEL[m.status]}</span>
                  <ChevronRight size={16} className="soft" />
                </Link>
              ))}
            </div>
          ) : (
            <Empty>{q ? "Nenhuma mensagem encontrada." : "Nenhuma mensagem ainda."}</Empty>
          )}
        </>
      )}
    </>
  );
}

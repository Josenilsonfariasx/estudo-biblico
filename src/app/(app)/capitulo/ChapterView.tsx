"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { Check, ChevronLeft, ChevronRight, PartyPopper, Sprout } from "lucide-react";
import { Empty, Field, Loading, PageHeader, SavedField, useAutosave } from "@/components/ui";
import { local } from "@/lib/local-db";
import { chapterLabel, usePlan } from "@/lib/plan";
import { emptyNote, noteId, patch, saveNote, setRead } from "@/lib/store";
import type { Chapter, Note } from "@/lib/types";
import styles from "./chapter.module.css";

const chapterHref = (id: string, encontro?: string | null) =>
  `/capitulo?id=${encodeURIComponent(id)}${encontro ? `&encontro=${encontro}` : ""}`;

export function ChapterView() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const encontro = params.get("encontro");
  const plan = usePlan();
  // null = sem anotação ainda; undefined = carregando.
  const note = useLiveQuery(async () => (await local.notes.get(noteId(id))) ?? null, [id]);

  if (!plan || note === undefined) return <Loading />;
  const info = plan.chapterInfo.get(id);
  const track = plan.tracks.find((t) => t.track.id === info?.track.id);
  const chapter = track?.chapters.find((c) => c.id === id);
  if (!info || !track || !chapter) return <Empty>Capítulo não encontrado.</Empty>;

  const index = track.chapters.indexOf(chapter);
  const prev = track.chapters[index - 1];
  const next = track.chapters[index + 1];
  // Página: se este capítulo não tem, mostra a última anotada antes dele no mesmo livro.
  const pageHint = track.chapters
    .slice(0, index)
    .reverse()
    .find((c) => c.book === chapter.book && c.page);
  // No encontro, depois da trilha atual vem a próxima trilha com leitura pendente.
  const otherTrack = plan.tracks.find((t) => t.track.id !== track.track.id && t.next);

  return (
    <>
      <PageHeader back={encontro ? "/" : true} title={chapterLabel(chapter)} subtitle={`${track.track.name} · ${info.phase.name}`} />

      <section className={`card stack`}>
        <SavedField
          key={chapter.id}
          single
          label="Página na sua Bíblia"
          value={chapter.page}
          placeholder={pageHint ? `${chapter.book} ${pageHint.number} está na pág. ${pageHint.page}` : "ex.: NT 25"}
          onSave={(page) => patch("chapters", chapter.id, { page: page.trim() })}
        />
        <ReadButton chapter={chapter} />
      </section>

      {encontro && chapter.readAt && (
        <EncounterNext step={encontro} next={encontro === "1" ? otherTrack?.next : null} />
      )}

      <NoteForm key={id} chapterId={id} initial={note ?? emptyNote(id)} readAt={chapter.readAt} reference={chapterLabel(chapter)} />

      <nav className={styles.pager}>
        {prev ? (
          <Link href={chapterHref(prev.id)} className="btn small secondary">
            <ChevronLeft size={16} /> {chapterLabel(prev)}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link href={chapterHref(next.id)} className="btn small secondary">
            {chapterLabel(next)} <ChevronRight size={16} />
          </Link>
        )}
      </nav>
    </>
  );
}

function ReadButton({ chapter }: { chapter: Chapter }) {
  if (!chapter.readAt) {
    return (
      <button className="btn" onClick={() => setRead(chapter.id, true)}>
        <Check size={18} /> Marcar como lido
      </button>
    );
  }
  const date = new Date(chapter.readAt).toLocaleDateString("pt-BR", { day: "numeric", month: "long" });
  return (
    <div className={styles.readDone}>
      <Check size={18} />
      <span className="grow">Lido em {date}</span>
      <button className="btn small secondary" onClick={() => setRead(chapter.id, false)}>
        Desmarcar
      </button>
    </div>
  );
}

function EncounterNext({ step, next }: { step: string; next?: Chapter | null }) {
  if (next) {
    return (
      <Link href={chapterHref(next.id, "2")} className={`card ${styles.encounter}`}>
        <span className="grow">
          <span className="soft">Agora a trilha paralela</span>
          <strong>{chapterLabel(next)}</strong>
        </span>
        <ChevronRight size={20} />
      </Link>
    );
  }
  return (
    <Link href="/" className={`card ${styles.encounter}`}>
      <PartyPopper size={20} />
      <span className="grow">
        <strong>Encontro concluído</strong>
        <span className="soft">{step === "2" ? "As duas trilhas de hoje estão feitas." : "Bom estudo!"} Voltar para Hoje.</span>
      </span>
    </Link>
  );
}

type NoteFields = Pick<Note, "verse" | "summary" | "learned" | "apply" | "questions" | "isSeed" | "seedIdea">;

function NoteForm({
  chapterId,
  initial,
  readAt,
  reference,
}: {
  chapterId: string;
  initial: Note;
  readAt: string | null;
  reference: string;
}) {
  const [fields, setFields] = useState<NoteFields>(initial);
  const save = useAutosave(fields, (f) => saveNote(chapterId, f));
  const set = (patchFields: Partial<NoteFields>) => {
    const next = { ...fields, ...patchFields };
    setFields(next);
    save(next);
  };
  const when = new Date(readAt ?? initial.createdAt).toLocaleDateString("pt-BR");

  return (
    <section className="card stack">
      <div className="row">
        <h2 className="grow">Anotação</h2>
        <span className="soft">
          {reference} · {when}
        </span>
      </div>
      <Field label="Versículo que chamou atenção" value={fields.verse} onChange={(verse) => set({ verse })} />
      <Field label="Resumo com minhas palavras" value={fields.summary} onChange={(summary) => set({ summary })} rows={3} />
      <Field label="O que aprendi" value={fields.learned} onChange={(learned) => set({ learned })} />
      <Field label="Como aplicar" value={fields.apply} onChange={(apply) => set({ apply })} />
      <Field label="Dúvidas (para pesquisar)" value={fields.questions} onChange={(questions) => set({ questions })} />

      <button
        type="button"
        className={`${styles.seedToggle} ${fields.isSeed ? styles.seedOn : ""}`}
        aria-pressed={fields.isSeed}
        onClick={() => set({ isSeed: !fields.isSeed })}
      >
        <Sprout size={20} />
        <span className="grow">Semente para mensagem?</span>
        <span>{fields.isSeed ? "Sim" : "Não"}</span>
      </button>
      {fields.isSeed && (
        <Field
          label="Ideia da semente"
          value={fields.seedIdea}
          onChange={(seedIdea) => set({ seedIdea })}
          placeholder="Qual mensagem poderia sair daqui?"
        />
      )}
      <p className="soft">Salvo automaticamente.</p>
    </section>
  );
}

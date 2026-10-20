"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Trash2 } from "lucide-react";
import { Empty, Loading, MoveButtons, PageHeader, ProgressBar, SavedField, Segmented } from "@/components/ui";
import { BOOKS, bookChapters } from "@/lib/bible";
import { local } from "@/lib/local-db";
import { chapterLabel, hasContent, usePlan } from "@/lib/plan";
import { addBlock, patch, removeBlock, setRead, swapOrder } from "@/lib/store";
import styles from "./phase.module.css";
import { confirmDialog } from "@/components/Dialog";

export function PhaseView() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const [editing, setEditing] = useState(params.get("editar") === "1");
  const [marking, setMarking] = useState(false);
  const plan = usePlan();
  const notes = useLiveQuery(() => local.notes.toArray());
  const noteByChapter = useMemo(() => new Map((notes ?? []).map((n) => [n.chapterId, n])), [notes]);

  if (!plan) return <Loading />;
  const track = plan.tracks.find((t) => t.phases.some((p) => p.phase.id === id));
  const node = track?.phases.find((p) => p.phase.id === id);
  if (!track || !node) return <Empty>Fase não encontrada.</Empty>;

  const { phase, blocks } = node;

  return (
    <>
      <PageHeader
        back="/plano"
        title={phase.name}
        subtitle={`${track.track.name} · ${node.read} de ${node.chapters.length}`}
        action={
          <button className="btn small secondary" onClick={() => setEditing(!editing)}>
            {editing ? "Concluir" : "Editar"}
          </button>
        }
      />
      {node.chapters.length > 0 && <ProgressBar value={node.read} total={node.chapters.length} />}

      {editing ? (
        <SavedField
          label="Descrição da fase"
          value={phase.description}
          onSave={(description) => patch("phases", phase.id, { description })}
        />
      ) : (
        phase.description && <p className="soft">{phase.description}</p>
      )}

      {!editing && blocks.length > 0 && (
        <>
          <Segmented
            value={marking ? "mark" : "open"}
            onChange={(v) => setMarking(v === "mark")}
            options={[
              { value: "open", label: "Abrir capítulo" },
              { value: "mark", label: "Marcar lidos" },
            ]}
          />
          <div className={styles.legend}>
            <span>
              <i className={`${styles.swatch} ${styles.read}`} /> lido
            </span>
            <span>
              <i className={`${styles.swatch} ${styles.next}`} /> próximo
            </span>
            <span>
              <i className={styles.dot} /> anotação
            </span>
            <span>
              <i className={`${styles.dot} ${styles.seedDot}`} /> semente
            </span>
          </div>
        </>
      )}


      {!blocks.length && !editing && (
        <Empty>
          Esta fase ainda não tem capítulos.
          <br />
          <button className="btn small secondary" style={{ marginTop: 12 }} onClick={() => setEditing(true)}>
            <Plus size={16} /> Adicionar bloco
          </button>
        </Empty>
      )}

      {blocks.map((b, i) => {
        const read = b.chapters.filter((c) => c.readAt).length;
        return (
          <section key={b.block.id} className="stack">
            <div className="row">
              <h2 className="section-title grow">
                {b.block.book} {b.block.fromCh}–{b.block.toCh} · {read}/{b.chapters.length}
              </h2>
              {editing && (
                <>
                  <MoveButtons
                    onUp={i > 0 ? () => swapOrder("blocks", b.block, blocks[i - 1].block) : undefined}
                    onDown={i < blocks.length - 1 ? () => swapOrder("blocks", b.block, blocks[i + 1].block) : undefined}
                  />
                  <button
                    className="btn small danger"
                    aria-label="Excluir bloco"
                    onClick={async () =>
                      (await confirmDialog({
                        title: `Excluir ${b.block.book} ${b.block.fromCh}–${b.block.toCh}?`,
                        message: "Os capítulos saem do plano. As anotações continuam guardadas.",
                        confirmLabel: "Excluir bloco",
                        danger: true,
                      })) && removeBlock(b.block.id)
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </div>
            {!editing && (
              <div className={styles.grid}>
                {b.chapters.map((c) => {
                  const note = noteByChapter.get(c.id);
                  const cls = [
                    styles.tile,
                    c.readAt && styles.read,
                    c.id === track.next?.id && styles.next,
                  ]
                    .filter(Boolean)
                    .join(" ");
                  const label = `${chapterLabel(c)}${c.readAt ? ", lido" : ""}${note?.isSeed ? ", semente" : hasContent(note) ? ", com anotação" : ""}`;
                  const mark = note?.isSeed ? (
                    <span className={`${styles.dot} ${styles.seedDot}`} />
                  ) : hasContent(note) ? (
                    <span className={styles.dot} />
                  ) : null;
                  return marking ? (
                    <button key={c.id} className={cls} aria-label={label} aria-pressed={!!c.readAt} onClick={() => setRead(c.id, !c.readAt)}>
                      {c.number}
                      {mark}
                    </button>
                  ) : (
                    <Link key={c.id} href={`/capitulo?id=${encodeURIComponent(c.id)}`} className={cls} aria-label={label}>
                      {c.number}
                      {mark}
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}

      {editing && <AddBlockForm phaseId={phase.id} order={(blocks.at(-1)?.block.order ?? -1) + 1} />}
    </>
  );
}

function AddBlockForm({ phaseId, order }: { phaseId: string; order: number }) {
  const [book, setBook] = useState("Mateus");
  const max = bookChapters(book);
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(max);

  const changeBook = (name: string) => {
    setBook(name);
    setFrom(1);
    setTo(bookChapters(name));
  };
  const valid = from >= 1 && to <= max && from <= to;

  return (
    <section className="card stack">
      <h2>Adicionar bloco</h2>
      <select value={book} onChange={(e) => changeBook(e.target.value)} aria-label="Livro">
        <optgroup label="Antigo Testamento">
          {BOOKS.filter((b) => b.testament === "AT").map((b) => (
            <option key={b.name}>{b.name}</option>
          ))}
        </optgroup>
        <optgroup label="Novo Testamento">
          {BOOKS.filter((b) => b.testament === "NT").map((b) => (
            <option key={b.name}>{b.name}</option>
          ))}
        </optgroup>
      </select>
      <div className="row">
        <label className={`grow ${styles.num}`}>
          Do capítulo
          <input type="number" inputMode="numeric" min={1} max={max} value={from} onChange={(e) => setFrom(+e.target.value)} />
        </label>
        <label className={`grow ${styles.num}`}>
          Até o
          <input type="number" inputMode="numeric" min={1} max={max} value={to} onChange={(e) => setTo(+e.target.value)} />
        </label>
      </div>
      <button className="btn" disabled={!valid} onClick={() => addBlock(phaseId, book, from, to, order)}>
        <Plus size={18} /> Adicionar {book} {from}–{to}
      </button>
    </section>
  );
}

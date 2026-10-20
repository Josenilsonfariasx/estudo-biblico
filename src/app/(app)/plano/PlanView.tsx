"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronRight, Plus, Trash2 } from "lucide-react";
import { Loading, MoveButtons, PageHeader, ProgressBar, SavedField } from "@/components/ui";
import { usePlan, type TrackNode } from "@/lib/plan";
import { addPhase, addTrack, patch, removePhase, removeTrack, swapOrder } from "@/lib/store";
import styles from "./plan.module.css";
import { confirmDialog } from "@/components/Dialog";

export function PlanView() {
  const plan = usePlan();
  const params = useSearchParams();
  const [editing, setEditing] = useState(params.get("editar") === "1");

  if (!plan) return <Loading />;

  const total = plan.tracks.reduce((n, t) => n + t.chapters.length, 0);
  const read = plan.tracks.reduce((n, t) => n + t.read, 0);

  return (
    <>
      <PageHeader
        title="Plano"
        subtitle={`${read} de ${total} capítulos lidos`}
        action={
          <button className="btn small secondary" onClick={() => setEditing(!editing)}>
            {editing ? "Concluir" : "Editar"}
          </button>
        }
      />
      <ProgressBar value={read} total={total} />

      {plan.tracks.map((t, i) => (
        <TrackSection
          key={t.track.id}
          node={t}
          editing={editing}
          prev={plan.tracks[i - 1]}
          next={plan.tracks[i + 1]}
        />
      ))}

      {editing && (
        <button
          className="btn secondary"
          onClick={() => addTrack("Nova trilha", (plan.tracks.at(-1)?.track.order ?? 0) + 1)}
        >
          <Plus size={18} /> Nova trilha
        </button>
      )}
    </>
  );
}

function TrackSection({
  node,
  editing,
  prev,
  next,
}: {
  node: TrackNode;
  editing: boolean;
  prev?: TrackNode;
  next?: TrackNode;
}) {
  const { track, phases } = node;
  return (
    <section className="stack">
      {editing ? (
        <div className={`card stack ${styles.editBox}`}>
          <SavedField single label="Nome da trilha" value={track.name} onSave={(name) => patch("tracks", track.id, { name })} />
          <div className="row">
            <MoveButtons
              onUp={prev && (() => swapOrder("tracks", track, prev.track))}
              onDown={next && (() => swapOrder("tracks", track, next.track))}
            />
            <span className="grow" />
            <button
              className="btn small danger"
              onClick={async () =>
                (await confirmDialog({
                  title: `Excluir a trilha “${track.name}”?`,
                  message: "Todas as fases e blocos dela saem do plano. As anotações continuam guardadas.",
                  confirmLabel: "Excluir trilha",
                  danger: true,
                })) && removeTrack(track.id)
              }
            >
              <Trash2 size={16} /> Excluir
            </button>
          </div>
        </div>
      ) : (
        <h2 className="section-title">
          {track.name} · {node.read}/{node.chapters.length}
        </h2>
      )}

      {phases.map((p, i) =>
        editing ? (
          <div key={p.phase.id} className="card stack">
            <SavedField single label="Nome da fase" value={p.phase.name} onSave={(name) => patch("phases", p.phase.id, { name })} />
            <div className="row">
              <MoveButtons
                onUp={i > 0 ? () => swapOrder("phases", p.phase, phases[i - 1].phase) : undefined}
                onDown={i < phases.length - 1 ? () => swapOrder("phases", p.phase, phases[i + 1].phase) : undefined}
              />
              <span className="grow" />
              <Link className="btn small secondary" href={`/fase?id=${p.phase.id}&editar=1`}>
                Blocos
              </Link>
              <button
                className="btn small danger"
                aria-label="Excluir fase"
                onClick={async () =>
                  (await confirmDialog({
                    title: `Excluir a fase “${p.phase.name}”?`,
                    message: "Os blocos dela saem do plano. As anotações continuam guardadas.",
                    confirmLabel: "Excluir fase",
                    danger: true,
                  })) && removePhase(p.phase.id)
                }
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ) : (
          <Link key={p.phase.id} href={`/fase?id=${p.phase.id}`} className={`card ${styles.phase}`}>
            <div className="row">
              <span className={styles.phaseNumber}>{i + 1}</span>
              <div className="grow">
                <h3>{p.phase.name}</h3>
                <p className="soft">
                  {p.chapters.length
                    ? `${p.read} de ${p.chapters.length} capítulos`
                    : "Vazia — toque para adicionar blocos"}
                </p>
              </div>
              <ChevronRight size={18} className="soft" />
            </div>
            {p.chapters.length > 0 && <ProgressBar value={p.read} total={p.chapters.length} />}
          </Link>
        ),
      )}

      {editing && (
        <button
          className="btn small secondary"
          onClick={() => addPhase(track.id, `Fase ${phases.length + 1}`, (phases.at(-1)?.phase.order ?? 0) + 1)}
        >
          <Plus size={16} /> Adicionar fase
        </button>
      )}
    </section>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { Sprout, Trash2 } from "lucide-react";
import { Empty, Field, Loading, PageHeader, Segmented, useAutosave } from "@/components/ui";
import { local } from "@/lib/local-db";
import { STATUS_LABEL } from "@/lib/plan";
import { put } from "@/lib/store";
import type { Message, MessageStatus } from "@/lib/types";
import { confirmDialog } from "@/components/Dialog";

export function MessageView() {
  const id = useSearchParams().get("id") ?? "";
  const message = useLiveQuery(async () => (await local.messages.get(id)) ?? null, [id]);

  if (message === undefined) return <Loading />;
  if (!message || message.deletedAt) return <Empty>Mensagem não encontrada.</Empty>;
  return <MessageForm key={id} initial={message} />;
}

// As 7 partes da estrutura de mensagem.
const PARTS: { key: keyof Message; label: string; hint: string; rows?: number }[] = [
  { key: "baseText", label: "1. Texto base", hint: "Passagem principal" },
  { key: "context", label: "2. Contexto", hint: "Quem, quando, por quê", rows: 3 },
  { key: "centralIdea", label: "3. Ideia central", hint: "Em uma frase" },
  { key: "points", label: "4. Pontos", hint: "2 ou 3 pontos", rows: 4 },
  { key: "example", label: "5. Exemplo do dia a dia", hint: "Uma história ou situação", rows: 3 },
  { key: "application", label: "6. Aplicação", hint: "O que fazer a partir disso", rows: 3 },
  { key: "prayer", label: "7. Oração final", hint: "", rows: 3 },
];

function MessageForm({ initial }: { initial: Message }) {
  const router = useRouter();
  const [msg, setMsg] = useState(initial);
  const save = useAutosave(msg, (m) => put("messages", m));
  const set = (p: Partial<Message>) => {
    const next = { ...msg, ...p };
    setMsg(next);
    save(next);
  };
  const note = useLiveQuery(async () => (msg.noteId ? ((await local.notes.get(msg.noteId)) ?? null) : null), [msg.noteId]);

  return (
    <>
      <PageHeader back="/sementes?aba=mensagens" title={msg.title || "Mensagem"} subtitle={STATUS_LABEL[msg.status]} />

      <section className="card stack">
        <Field single label="Título" value={msg.title} onChange={(title) => set({ title })} />
        <Segmented<MessageStatus>
          value={msg.status}
          onChange={(status) =>
            set({
              status,
              preachedAt: status === "preached" ? (msg.preachedAt ?? new Date().toLocaleDateString("sv-SE")) : msg.preachedAt,
            })
          }
          options={[
            { value: "draft", label: "Rascunho" },
            { value: "ready", label: "Pronta" },
            { value: "preached", label: "Pregada" },
          ]}
        />
        {msg.status === "preached" && (
          <label className="row soft">
            Pregada em
            <input
              type="date"
              className="grow"
              value={msg.preachedAt ?? ""}
              onChange={(e) => set({ preachedAt: e.target.value || null })}
              style={{ minHeight: 40, padding: "0 10px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", font: "inherit" }}
            />
          </label>
        )}
        {note && (
          <Link href={`/capitulo?id=${encodeURIComponent(note.chapterId)}`} className="badge seed" style={{ alignSelf: "flex-start" }}>
            <Sprout size={14} /> Ver a semente de origem
          </Link>
        )}
      </section>

      <section className="card stack">
        {PARTS.map((p) => (
          <Field
            key={p.key}
            label={p.label}
            placeholder={p.hint}
            rows={p.rows ?? 2}
            value={(msg[p.key] as string) ?? ""}
            onChange={(v) => set({ [p.key]: v })}
          />
        ))}
        <p className="soft">Salvo automaticamente.</p>
      </section>

      <button
        className="btn danger"
        onClick={async () => {
          const ok = await confirmDialog({
            title: "Excluir esta mensagem?",
            message: "A semente de origem continua guardada.",
            confirmLabel: "Excluir mensagem",
            danger: true,
          });
          if (!ok) return;
          // Passa pelo salvamento automático para não haver gravação pendente que a "ressuscite".
          set({ deletedAt: new Date().toISOString() });
          router.replace("/sementes?aba=mensagens");
        }}
      >
        <Trash2 size={18} /> Excluir mensagem
      </button>
    </>
  );
}

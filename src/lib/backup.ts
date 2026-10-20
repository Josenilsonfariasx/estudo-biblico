// Backup: exportar tudo (JSON para restaurar, Markdown para ler) e importar um JSON.
"use client";

import type { Table } from "dexie";
import { local } from "./local-db";
import { STATUS_LABEL, buildPlan, chapterLabel } from "./plan";
import { TABLE_NAMES } from "./sync-schema";
import { scheduleSync } from "./sync-client";
import type { Base, TableName } from "./types";

const table = (t: TableName) => local[t] as unknown as Table<Base, string>;
const today = () => new Date().toLocaleDateString("sv-SE");

function download(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportJson() {
  const data: Record<string, Base[]> = {};
  for (const t of TABLE_NAMES) {
    data[t] = (await table(t).toArray()).map((r) => {
      const copy = { ...r };
      delete copy.dirty;
      return copy;
    });
  }
  const backup = { app: "lampada", version: 1, exportedAt: new Date().toISOString(), data };
  download(JSON.stringify(backup, null, 2), `lampada-backup-${today()}.json`, "application/json");
}

/** Restaura um backup: os registros do arquivo passam a valer como a edição mais recente. */
export async function importJson(file: File): Promise<number> {
  const backup = JSON.parse(await file.text());
  if (backup?.app !== "lampada" || typeof backup.data !== "object") {
    throw new Error("Este arquivo não é um backup do Lâmpada.");
  }
  const modifiedAt = new Date().toISOString();
  let count = 0;
  for (const t of TABLE_NAMES) {
    const rows = backup.data[t];
    if (!Array.isArray(rows)) continue;
    const valid = rows.filter((r) => r && typeof r.id === "string");
    await table(t).bulkPut(valid.map((r) => ({ ...r, modifiedAt, dirty: 1 as const })));
    count += valid.length;
  }
  scheduleSync(0);
  return count;
}

export async function exportMarkdown() {
  const [tracks, phases, blocks, chapters, notes, reviews, messages] = await Promise.all([
    local.tracks.toArray(),
    local.phases.toArray(),
    local.blocks.toArray(),
    local.chapters.toArray(),
    local.notes.toArray(),
    local.reviews.toArray(),
    local.messages.toArray(),
  ]);
  const plan = buildPlan(tracks, phases, blocks, chapters);
  const noteMap = new Map(notes.filter((n) => !n.deletedAt).map((n) => [n.chapterId, n]));
  const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "");
  const out: string[] = [`# Lâmpada — Diário Bíblico`, ``, `Exportado em ${new Date().toLocaleString("pt-BR")}.`, ``];

  out.push(`## Anotações`, ``);
  for (const t of plan.tracks) {
    for (const c of t.chapters) {
      const n = noteMap.get(c.id);
      if (!n || !(n.verse || n.summary || n.learned || n.apply || n.questions || n.seedIdea)) continue;
      out.push(`### ${chapterLabel(c)}${n.isSeed ? " 🌱" : ""}`, ``);
      if (c.readAt) out.push(`*Lido em ${date(c.readAt)} · ${t.track.name}*`, ``);
      if (n.verse) out.push(`> ${n.verse}`, ``);
      if (n.summary) out.push(`**Resumo:** ${n.summary}`, ``);
      if (n.learned) out.push(`**O que aprendi:** ${n.learned}`, ``);
      if (n.apply) out.push(`**Como aplicar:** ${n.apply}`, ``);
      if (n.questions) out.push(`**Dúvidas:** ${n.questions}`, ``);
      if (n.isSeed && n.seedIdea) out.push(`**Semente:** ${n.seedIdea}`, ``);
    }
  }

  const doneReviews = reviews.filter((r) => !r.deletedAt && (r.verse || r.reflection)).sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  if (doneReviews.length) {
    out.push(`## Revisões semanais`, ``);
    for (const r of doneReviews) {
      out.push(`### Semana de ${date(r.weekStart + "T00:00")}`, ``);
      if (r.verse) out.push(`> ${r.verse}${r.verseRef ? ` — ${r.verseRef}` : ""}`, ``);
      if (r.reflection) out.push(r.reflection, ``);
    }
  }

  const liveMessages = messages.filter((m) => !m.deletedAt);
  if (liveMessages.length) {
    out.push(`## Mensagens`, ``);
    for (const m of liveMessages) {
      out.push(`### ${m.title || "Sem título"} (${STATUS_LABEL[m.status]}${m.preachedAt ? ` em ${date(m.preachedAt + "T00:00")}` : ""})`, ``);
      const parts: [string, string][] = [
        ["Texto base", m.baseText],
        ["Contexto", m.context],
        ["Ideia central", m.centralIdea],
        ["Pontos", m.points],
        ["Exemplo", m.example],
        ["Aplicação", m.application],
        ["Oração final", m.prayer],
      ];
      for (const [label, text] of parts) if (text) out.push(`**${label}:** ${text}`, ``);
    }
  }

  download(out.join("\n"), `lampada-${today()}.md`, "text/markdown");
}

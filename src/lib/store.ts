// Gravações feitas pelas telas. Tudo vai para o banco local e é marcado para sincronizar.
"use client";

import type { Table } from "dexie";
import { local } from "./local-db";
import { chapterId as makeChapterId } from "./plan-seed";
import { scheduleSync } from "./sync-client";
import type { Base, Block, Chapter, Message, Note, Phase, Review, TableName, Tables, Track } from "./types";

const now = () => new Date().toISOString();
const table = <T extends TableName>(t: T) => local[t] as unknown as Table<Tables[T], string>;

export function newId() {
  return crypto.randomUUID();
}

/** Grava um registro inteiro. */
export async function put<T extends TableName>(t: T, record: Omit<Tables[T], keyof Base> & Partial<Base>) {
  await table(t).put({ deletedAt: null, ...record, modifiedAt: now(), dirty: 1 } as Tables[T]);
  scheduleSync();
}

/** Altera alguns campos de um registro existente. */
export async function patch<T extends TableName>(t: T, id: string, changes: Partial<Tables[T]>) {
  await table(t).update(id, { ...changes, modifiedAt: now(), dirty: 1 } as never);
  scheduleSync();
}

export async function remove(t: TableName, id: string) {
  await patch(t, id, { deletedAt: now() });
}

// ---------- Leitura e anotações ----------

export async function setRead(chapterId: string, read: boolean) {
  await patch("chapters", chapterId, { readAt: read ? now() : null });
}

export const noteId = (chapterId: string) => `n:${chapterId}`;

export function emptyNote(chapterId: string): Note {
  return {
    id: noteId(chapterId),
    chapterId,
    verse: "",
    summary: "",
    learned: "",
    apply: "",
    questions: "",
    isSeed: false,
    seedIdea: "",
    createdAt: now(),
    modifiedAt: now(),
    deletedAt: null,
  };
}

export async function saveNote(chapterId: string, fields: Partial<Note>) {
  const existing = await local.notes.get(noteId(chapterId));
  await put("notes", { ...(existing ?? emptyNote(chapterId)), ...fields, deletedAt: null });
}

// ---------- Revisão semanal ----------

export const reviewId = (weekStart: string) => `rv:${weekStart}`;

export async function saveReview(weekStart: string, fields: Partial<Review>) {
  const existing = await local.reviews.get(reviewId(weekStart));
  await put("reviews", {
    id: reviewId(weekStart),
    weekStart,
    verse: "",
    verseRef: "",
    reflection: "",
    completedAt: null,
    ...existing,
    ...fields,
  });
}

// ---------- Mensagens ----------

export async function createMessage(from?: { note: Note; reference: string }) {
  const id = newId();
  const message: Omit<Message, keyof Base> & { id: string } = {
    id,
    noteId: from?.note.id ?? null,
    title: from ? from.note.seedIdea.split("\n")[0].slice(0, 80) : "",
    baseText: from ? [from.reference, from.note.verse].filter(Boolean).join(" — ") : "",
    context: "",
    centralIdea: from?.note.seedIdea ?? "",
    points: "",
    example: "",
    application: from?.note.apply ?? "",
    prayer: "",
    status: "draft",
    preachedAt: null,
    createdAt: now(),
  };
  await put("messages", message);
  return id;
}

// ---------- Edição do plano ----------

export async function addTrack(name: string, order: number) {
  const id = newId();
  await put("tracks", { id, name, order } as Omit<Track, keyof Base> & { id: string });
  await addPhase(id, "Fase 1", 0);
  return id;
}

export async function addPhase(trackId: string, name: string, order: number) {
  const id = newId();
  await put("phases", { id, trackId, name, description: "", order } as Omit<Phase, keyof Base> & { id: string });
  return id;
}

export async function addBlock(phaseId: string, book: string, fromCh: number, toCh: number, order: number) {
  const id = newId();
  const ts = now();
  await local.transaction("rw", local.blocks, local.chapters, async () => {
    await local.blocks.put({ id, phaseId, book, fromCh, toCh, order, modifiedAt: ts, deletedAt: null, dirty: 1 } as Block);
    const chapters: Chapter[] = [];
    for (let n = fromCh; n <= toCh; n++) {
      chapters.push({
        id: makeChapterId(id, n),
        blockId: id,
        book,
        number: n,
        page: "",
        readAt: null,
        modifiedAt: ts,
        deletedAt: null,
        dirty: 1,
      });
    }
    await local.chapters.bulkPut(chapters);
  });
  scheduleSync();
}

export async function removeBlock(blockId: string) {
  const ts = now();
  await local.transaction("rw", local.blocks, local.chapters, async () => {
    await local.blocks.update(blockId, { deletedAt: ts, modifiedAt: ts, dirty: 1 });
    await local.chapters.where("blockId").equals(blockId).modify({ deletedAt: ts, modifiedAt: ts, dirty: 1 });
  });
  scheduleSync();
}

export async function removePhase(phaseId: string) {
  const blocks = await local.blocks.where("phaseId").equals(phaseId).toArray();
  for (const b of blocks) if (!b.deletedAt) await removeBlock(b.id);
  await remove("phases", phaseId);
}

export async function removeTrack(trackId: string) {
  const phases = await local.phases.where("trackId").equals(trackId).toArray();
  for (const p of phases) if (!p.deletedAt) await removePhase(p.id);
  await remove("tracks", trackId);
}

/** Troca a posição de dois itens (fases, blocos ou trilhas). */
export async function swapOrder(t: "tracks" | "phases" | "blocks", a: { id: string; order: number }, b: { id: string; order: number }) {
  await patch(t, a.id, { order: b.order });
  await patch(t, b.id, { order: a.order === b.order ? a.order + 1 : a.order });
}

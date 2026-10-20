// Banco local do aparelho (IndexedDB). As telas leem e gravam aqui; a sincronização leva ao servidor.
import Dexie, { type Table } from "dexie";
import type { Tables } from "./types";

type Meta = { key: string; value: unknown };

class LampadaDB extends Dexie {
  profile!: Table<Tables["profile"], string>;
  tracks!: Table<Tables["tracks"], string>;
  phases!: Table<Tables["phases"], string>;
  blocks!: Table<Tables["blocks"], string>;
  chapters!: Table<Tables["chapters"], string>;
  notes!: Table<Tables["notes"], string>;
  reviews!: Table<Tables["reviews"], string>;
  messages!: Table<Tables["messages"], string>;
  meta!: Table<Meta, string>;

  constructor() {
    super("lampada");
    this.version(1).stores({
      profile: "id, dirty",
      tracks: "id, dirty",
      phases: "id, trackId, dirty",
      blocks: "id, phaseId, dirty",
      chapters: "id, blockId, readAt, dirty",
      notes: "id, chapterId, dirty",
      reviews: "id, weekStart, dirty",
      messages: "id, noteId, dirty",
      meta: "key",
    });
  }
}

export const local = new LampadaDB();

export async function getMeta<T>(key: string): Promise<T | undefined> {
  return (await local.meta.get(key))?.value as T | undefined;
}

export async function setMeta(key: string, value: unknown) {
  await local.meta.put({ key, value });
}

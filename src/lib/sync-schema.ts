// Descrição de cada tabela sincronizada: campos aceitos e seus tipos.
// Usada pelo servidor para validar o que chega e pelo cliente para saber o que existe.
import type { TableName } from "./types";

type FieldType = "string" | "int" | "bool" | "date" | "string?" | "date?";

export const TABLE_NAMES: TableName[] = [
  "profile",
  "tracks",
  "phases",
  "blocks",
  "chapters",
  "notes",
  "reviews",
  "messages",
];

const common = { id: "string", modifiedAt: "date", deletedAt: "date?" } as const;

export const FIELDS: Record<TableName, Record<string, FieldType>> = {
  profile: { ...common, displayName: "string", photo: "string?", weekStartsOn: "int" },
  tracks: { ...common, name: "string", order: "int" },
  phases: { ...common, trackId: "string", name: "string", description: "string", order: "int" },
  blocks: { ...common, phaseId: "string", book: "string", fromCh: "int", toCh: "int", order: "int" },
  chapters: { ...common, blockId: "string", book: "string", number: "int", page: "string", readAt: "date?" },
  notes: {
    ...common,
    chapterId: "string",
    verse: "string",
    summary: "string",
    learned: "string",
    apply: "string",
    questions: "string",
    isSeed: "bool",
    seedIdea: "string",
    createdAt: "date",
  },
  reviews: {
    ...common,
    weekStart: "string",
    verse: "string",
    verseRef: "string",
    reflection: "string",
    completedAt: "date?",
  },
  messages: {
    ...common,
    noteId: "string?",
    title: "string",
    baseText: "string",
    context: "string",
    centralIdea: "string",
    points: "string",
    example: "string",
    application: "string",
    prayer: "string",
    status: "string",
    preachedAt: "string?",
    createdAt: "date",
  },
};

const MAX_TEXT = 50_000;
const MAX_PHOTO = 700_000;

/** Valida e converte um registro vindo do cliente. Retorna null se inválido. */
export function parseRecord(table: TableName, raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const input = raw as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [field, type] of Object.entries(FIELDS[table])) {
    const v = input[field];
    const optional = type.endsWith("?");
    if (v === null || v === undefined) {
      if (!optional) return null;
      out[field] = null;
      continue;
    }
    switch (type.replace("?", "")) {
      case "string": {
        const max = field === "photo" ? MAX_PHOTO : MAX_TEXT;
        if (typeof v !== "string" || v.length > max) return null;
        out[field] = v;
        break;
      }
      case "int":
        if (typeof v !== "number" || !Number.isInteger(v)) return null;
        out[field] = v;
        break;
      case "bool":
        if (typeof v !== "boolean") return null;
        out[field] = v;
        break;
      case "date": {
        const d = typeof v === "string" ? new Date(v) : null;
        if (!d || Number.isNaN(d.getTime())) return null;
        out[field] = d;
        break;
      }
    }
  }
  if (!(out.id as string).length || (out.id as string).length > 200) return null;
  return out;
}

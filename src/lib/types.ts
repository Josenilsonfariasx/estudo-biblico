// Formato dos registros trocados entre aparelho e servidor (datas em ISO).

export type Base = {
  id: string;
  modifiedAt: string;
  deletedAt: string | null;
  /** Só no aparelho: 1 = alteração ainda não enviada ao servidor. */
  dirty?: 0 | 1;
};

export type Profile = Base & { displayName: string; photo: string | null; weekStartsOn: number };
export type Track = Base & { name: string; order: number };
export type Phase = Base & { trackId: string; name: string; description: string; order: number };
export type Block = Base & { phaseId: string; book: string; fromCh: number; toCh: number; order: number };
export type Chapter = Base & {
  blockId: string;
  book: string;
  number: number;
  page: string;
  readAt: string | null;
};
export type Note = Base & {
  chapterId: string;
  verse: string;
  summary: string;
  learned: string;
  apply: string;
  questions: string;
  isSeed: boolean;
  seedIdea: string;
  createdAt: string;
};
export type Review = Base & {
  weekStart: string;
  verse: string;
  verseRef: string;
  reflection: string;
  completedAt: string | null;
};
export type MessageStatus = "draft" | "ready" | "preached";
export type Message = Base & {
  noteId: string | null;
  title: string;
  baseText: string;
  context: string;
  centralIdea: string;
  points: string;
  example: string;
  application: string;
  prayer: string;
  status: MessageStatus;
  preachedAt: string | null;
  createdAt: string;
};

export type Tables = {
  profile: Profile;
  tracks: Track;
  phases: Phase;
  blocks: Block;
  chapters: Chapter;
  notes: Note;
  reviews: Review;
  messages: Message;
};
export type TableName = keyof Tables;

export type Changes = { [K in TableName]?: Tables[K][] };

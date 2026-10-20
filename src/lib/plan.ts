// Leitura dos dados locais, já organizados para as telas.
"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { local } from "./local-db";
import { dayKey } from "./dates";
import type { Block, Chapter, MessageStatus, Note, Phase, Profile, Track } from "./types";

export type BlockNode = { block: Block; chapters: Chapter[] };
export type PhaseNode = { phase: Phase; blocks: BlockNode[]; chapters: Chapter[]; read: number };
export type TrackNode = {
  track: Track;
  phases: PhaseNode[];
  chapters: Chapter[];
  read: number;
  next: Chapter | null;
};
export type Plan = {
  tracks: TrackNode[];
  chapterInfo: Map<string, { track: Track; phase: Phase; block: Block }>;
};

const alive = <T extends { deletedAt: string | null }>(rows: T[]) => rows.filter((r) => !r.deletedAt);
const byOrder = <T extends { order: number }>(a: T, b: T) => a.order - b.order;

export function buildPlan(tracks: Track[], phases: Phase[], blocks: Block[], chapters: Chapter[]): Plan {
  const chapterInfo: Plan["chapterInfo"] = new Map();
  const chaptersByBlock = new Map<string, Chapter[]>();
  for (const c of alive(chapters)) {
    const list = chaptersByBlock.get(c.blockId) ?? [];
    list.push(c);
    chaptersByBlock.set(c.blockId, list);
  }
  const liveBlocks = alive(blocks).sort(byOrder);
  const livePhases = alive(phases).sort(byOrder);

  const trackNodes = alive(tracks)
    .sort(byOrder)
    .map((track) => {
      const phaseNodes = livePhases
        .filter((p) => p.trackId === track.id)
        .map((phase) => {
          const blockNodes = liveBlocks
            .filter((b) => b.phaseId === phase.id)
            .map((block) => {
              const list = (chaptersByBlock.get(block.id) ?? []).sort((a, b) => a.number - b.number);
              for (const c of list) chapterInfo.set(c.id, { track, phase, block });
              return { block, chapters: list };
            });
          const all = blockNodes.flatMap((b) => b.chapters);
          return { phase, blocks: blockNodes, chapters: all, read: all.filter((c) => c.readAt).length };
        });
      const all = phaseNodes.flatMap((p) => p.chapters);
      return {
        track,
        phases: phaseNodes,
        chapters: all,
        read: all.filter((c) => c.readAt).length,
        // Próximo = o primeiro, na ordem do plano, ainda não lido.
        next: all.find((c) => !c.readAt) ?? null,
      };
    });
  return { tracks: trackNodes, chapterInfo };
}

export function usePlan(): Plan | undefined {
  return useLiveQuery(async () => {
    const [tracks, phases, blocks, chapters] = await Promise.all([
      local.tracks.toArray(),
      local.phases.toArray(),
      local.blocks.toArray(),
      local.chapters.toArray(),
    ]);
    return buildPlan(tracks, phases, blocks, chapters);
  });
}

export const DEFAULT_PROFILE: Profile = {
  id: "me",
  displayName: "",
  photo: null,
  weekStartsOn: 1,
  modifiedAt: new Date(0).toISOString(),
  deletedAt: null,
};

export function useProfile(): Profile {
  return useLiveQuery(() => local.profile.get("me")) ?? DEFAULT_PROFILE;
}

/** Dias (AAAA-MM-DD, fuso local) com capítulo lido ou revisão concluída. */
export function useStudiedDays(): Set<string> | undefined {
  return useLiveQuery(async () => {
    const days = new Set<string>();
    const read = await local.chapters.where("readAt").above("").toArray();
    for (const c of read) if (!c.deletedAt && c.readAt) days.add(dayKey(new Date(c.readAt)));
    for (const r of await local.reviews.toArray()) {
      if (!r.deletedAt && r.completedAt) days.add(dayKey(new Date(r.completedAt)));
    }
    return days;
  });
}

export function chapterLabel(c: { book: string; number: number }) {
  return `${c.book} ${c.number}`;
}

/** A anotação tem algo escrito (ou é semente)? */
export function hasContent(n?: Note | null) {
  return !!n && !n.deletedAt && !!(n.verse || n.summary || n.learned || n.apply || n.questions || n.seedIdea || n.isSeed);
}

export const STATUS_LABEL: Record<MessageStatus, string> = {
  draft: "Rascunho",
  ready: "Pronta",
  preached: "Pregada",
};

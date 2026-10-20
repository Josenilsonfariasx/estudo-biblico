// Plano padrão do documento. IDs fixos: carregar de novo não duplica nada.

type SeedBlock = { id: string; book: string; from: number; to: number; pages?: Record<number, string> };
type SeedPhase = { id: string; name: string; description: string; blocks: SeedBlock[] };
type SeedTrack = { id: string; name: string; phases: SeedPhase[] };

export const DEFAULT_PLAN: SeedTrack[] = [
  {
    id: "t-principal",
    name: "Trilha principal",
    phases: [
      {
        id: "f1",
        name: "Quem é Jesus",
        description: "Conhecer Jesus e a base da fé, começando pelos Evangelhos.",
        blocks: [
          { id: "b-mc", book: "Marcos", from: 1, to: 16, pages: { 1: "NT 25" } },
          { id: "b-jo", book: "João", from: 1, to: 21, pages: { 1: "NT 68" } },
          { id: "b-at1", book: "Atos", from: 1, to: 12, pages: { 1: "NT 87" } },
        ],
      },
      {
        id: "f2",
        name: "A igreja e a fé na prática",
        description: "A igreja nascendo e a fé aplicada ao dia a dia.",
        blocks: [
          { id: "b-at2", book: "Atos", from: 13, to: 28 },
          { id: "b-rm", book: "Romanos", from: 1, to: 16 },
          { id: "b-tg", book: "Tiago", from: 1, to: 5 },
          { id: "b-fp", book: "Filipenses", from: 1, to: 4 },
        ],
      },
      {
        id: "f3",
        name: "O começo de tudo",
        description: "A criação, os patriarcas e a libertação do Egito.",
        blocks: [
          { id: "b-gn", book: "Gênesis", from: 1, to: 50 },
          { id: "b-ex", book: "Êxodo", from: 1, to: 20 },
        ],
      },
      {
        id: "f4",
        name: "Visão completa",
        description: "O restante da Bíblia, em blocos que você adiciona quando chegar a hora.",
        blocks: [],
      },
    ],
  },
  {
    id: "t-paralela",
    name: "Trilha paralela",
    phases: [
      {
        id: "fp1",
        name: "Salmos e Provérbios",
        description: "Um capítulo curto por encontro, em contato com o Antigo Testamento.",
        blocks: [
          { id: "b-sl", book: "Salmos", from: 1, to: 150 },
          { id: "b-pv", book: "Provérbios", from: 1, to: 31 },
        ],
      },
    ],
  },
];

export function chapterId(blockId: string, n: number) {
  return `${blockId}:${n}`;
}

/** Registros do plano padrão, prontos para gravar (modifiedAt antigo: qualquer edição vence). */
export function defaultPlanRecords() {
  const modifiedAt = new Date(0);
  const tracks = [];
  const phases = [];
  const blocks = [];
  const chapters = [];
  for (const [ti, t] of DEFAULT_PLAN.entries()) {
    tracks.push({ id: t.id, name: t.name, order: ti, modifiedAt });
    for (const [pi, p] of t.phases.entries()) {
      phases.push({ id: p.id, trackId: t.id, name: p.name, description: p.description, order: pi, modifiedAt });
      for (const [bi, b] of p.blocks.entries()) {
        blocks.push({ id: b.id, phaseId: p.id, book: b.book, fromCh: b.from, toCh: b.to, order: bi, modifiedAt });
        for (let n = b.from; n <= b.to; n++) {
          chapters.push({
            id: chapterId(b.id, n),
            blockId: b.id,
            book: b.book,
            number: n,
            page: b.pages?.[n] ?? "",
            modifiedAt,
          });
        }
      }
    }
  }
  return { tracks, phases, blocks, chapters };
}

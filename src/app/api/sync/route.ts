// Sincronização: GET devolve o que mudou desde `since`; POST recebe alterações do aparelho.
import { db } from "@/lib/db";
import { defaultPlanRecords } from "@/lib/plan-seed";
import { FIELDS, TABLE_NAMES, parseRecord } from "@/lib/sync-schema";
import type { TableName } from "@/lib/types";

export const dynamic = "force-dynamic";

// Delegates do Prisma por tabela (todos têm a mesma forma de uso aqui).
type Delegate = {
  findMany(args: object): Promise<Record<string, unknown>[]>;
  upsert(args: object): Promise<unknown>;
  createMany(args: object): Promise<unknown>;
  count(): Promise<number>;
};
const model = (t: TableName) =>
  ({
    profile: db.profile,
    tracks: db.track,
    phases: db.phase,
    blocks: db.block,
    chapters: db.chapter,
    notes: db.note,
    reviews: db.review,
    messages: db.message,
  })[t] as unknown as Delegate;

/** Na primeira sincronização, grava o plano padrão e o perfil. */
async function ensureSeed() {
  if ((await model("tracks").count()) > 0) return;
  const plan = defaultPlanRecords();
  await db.$transaction([
    db.track.createMany({ data: plan.tracks, skipDuplicates: true }),
    db.phase.createMany({ data: plan.phases, skipDuplicates: true }),
    db.block.createMany({ data: plan.blocks, skipDuplicates: true }),
    db.chapter.createMany({ data: plan.chapters, skipDuplicates: true }),
    db.profile.createMany({ data: [{ id: "me", modifiedAt: new Date(0) }], skipDuplicates: true }),
  ]);
}

function serialize(table: TableName, row: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const field of Object.keys(FIELDS[table])) {
    const v = row[field];
    out[field] = v instanceof Date ? v.toISOString() : v;
  }
  return out;
}

export async function GET(req: Request) {
  await ensureSeed();
  const sinceParam = new URL(req.url).searchParams.get("since");
  const since = sinceParam ? new Date(sinceParam) : null;
  // Hora capturada antes das consultas: o que for gravado durante a leitura vem na próxima.
  const serverTime = new Date();
  const where = since && !Number.isNaN(since.getTime()) ? { updatedAt: { gt: since } } : {};

  const changes: Record<string, unknown[]> = {};
  for (const t of TABLE_NAMES) {
    const rows = await model(t).findMany({ where });
    changes[t] = rows.map((r) => serialize(t, r));
  }
  return Response.json({ serverTime: serverTime.toISOString(), changes });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.changes || typeof body.changes !== "object") {
    return Response.json({ error: "Formato inválido." }, { status: 400 });
  }

  let applied = 0;
  let skipped = 0;
  for (const t of TABLE_NAMES) {
    const incoming = body.changes[t];
    if (!Array.isArray(incoming)) continue;
    const records = incoming.map((r) => parseRecord(t, r)).filter((r) => r !== null);
    skipped += incoming.length - records.length;
    if (!records.length) continue;

    // Vale a última edição: ignora o que for mais antigo que o já gravado.
    const existing = await model(t).findMany({
      where: { id: { in: records.map((r) => r.id) } },
      select: { id: true, modifiedAt: true },
    });
    const current = new Map(existing.map((e) => [e.id as string, e.modifiedAt as Date]));
    for (const r of records) {
      const prev = current.get(r.id as string);
      if (prev && prev > (r.modifiedAt as Date)) {
        skipped++;
        continue;
      }
      const { id, ...data } = r;
      await model(t).upsert({ where: { id }, create: r, update: data });
      applied++;
    }
  }
  return Response.json({ ok: true, applied, skipped });
}

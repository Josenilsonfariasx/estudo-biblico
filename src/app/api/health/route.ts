import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Usado pelo Easypanel/Docker para saber se o app e o banco estão de pé.
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ ok: true, db: true });
  } catch {
    return Response.json({ ok: false, db: false }, { status: 503 });
  }
}

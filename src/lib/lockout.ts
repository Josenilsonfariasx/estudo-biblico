// Bloqueio de login: 5 erros seguidos travam o login por 15 minutos.
import { db } from "@/lib/db";

const MAX_FAILURES = 5;
const LOCK_MS = 15 * 60 * 1000;

/** Retorna até quando o login está bloqueado, ou null se está liberado. */
export async function lockedUntil(now = new Date()): Promise<Date | null> {
  const recent = await db.loginAttempt.findMany({
    orderBy: { createdAt: "desc" },
    take: MAX_FAILURES,
  });
  if (recent.length < MAX_FAILURES || recent.some((a) => a.ok)) return null;
  const until = new Date(recent[0].createdAt.getTime() + LOCK_MS);
  return until > now ? until : null;
}

export async function recordAttempt(ok: boolean) {
  await db.loginAttempt.create({ data: { ok } });
}

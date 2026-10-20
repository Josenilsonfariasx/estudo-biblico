import { cookies } from "next/headers";
import { lockedUntil, recordAttempt } from "@/lib/lockout";
import { safeEqual, verifyPassword } from "@/lib/password";
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions } from "@/lib/session";

export async function POST(req: Request) {
  const { AUTH_USERNAME, AUTH_PASSWORD_HASH } = process.env;
  if (!AUTH_USERNAME || !AUTH_PASSWORD_HASH) {
    console.error("AUTH_USERNAME/AUTH_PASSWORD_HASH não configurados");
    return Response.json({ error: "Login não configurado no servidor." }, { status: 500 });
  }

  const until = await lockedUntil();
  if (until) {
    const minutes = Math.ceil((until.getTime() - Date.now()) / 60000);
    return Response.json(
      { error: `Muitas tentativas. Tente de novo em ${minutes} min.` },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  // Sempre verifica a senha, mesmo com usuário errado, para não revelar qual dos dois falhou.
  const passwordOk = await verifyPassword(password, AUTH_PASSWORD_HASH);
  const ok = safeEqual(username, AUTH_USERNAME) && passwordOk;
  await recordAttempt(ok);

  if (!ok) return Response.json({ error: "Usuário ou senha inválidos." }, { status: 401 });

  (await cookies()).set(SESSION_COOKIE, await createSessionToken(AUTH_USERNAME), sessionCookieOptions);
  return Response.json({ ok: true });
}

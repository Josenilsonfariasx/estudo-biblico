// Service worker do modo offline. Gerado aqui para levar a versão do build:
// quando o app é atualizado, o celular baixa as telas novas e descarta as antigas.

export const dynamic = "force-static";

const VERSION = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";

// Telas do app guardadas para abrir sem internet (os parâmetros, como ?id=, são lidos no aparelho).
const PAGES = ["/", "/plano", "/fase", "/capitulo", "/revisao", "/sementes", "/mensagem", "/mais", "/historico"];

const script = `
const CACHE = "lampada-${VERSION}";
const PAGES = ${JSON.stringify(PAGES)};
const STATIC = ["/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/apple-touch-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const assets = new Set(STATIC);
    for (const page of PAGES) {
      try {
        const res = await fetch(page, { credentials: "same-origin" });
        // Redirecionado = sem login: não guarda a tela de login no lugar da tela do app.
        if (!res.ok || res.redirected) continue;
        const html = await res.clone().text();
        await cache.put(page, res);
        for (const m of html.matchAll(/\\/_next\\/static\\/[^"'\\\\\\s)]+/g)) assets.add(m[0]);
      } catch (e) {}
    }
    await Promise.all([...assets].map(async (url) => {
      try {
        const res = await fetch(url);
        if (res.ok) await cache.put(url, res);
      } catch (e) {}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname === "/sw.js") return;

  // Arquivos com hash no nome nunca mudam: cache primeiro.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      const res = await fetch(req);
      if (res.ok) (await caches.open(CACHE)).put(req, res.clone());
      return res;
    })());
    return;
  }

  // Telas: rede primeiro (sempre a versão nova); sem conexão, a cópia guardada.
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res.ok && !res.redirected && PAGES.includes(url.pathname)) {
          (await caches.open(CACHE)).put(url.pathname, res.clone());
        }
        return res;
      } catch (e) {
        return (await caches.match(url.pathname, { ignoreSearch: true }))
          || (await caches.match("/"))
          || new Response("Sem conexão.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
      }
    })());
  }
});
`;

export function GET() {
  return new Response(script, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}

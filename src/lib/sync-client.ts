// Motor de sincronização do aparelho: envia o que mudou aqui e baixa o que mudou no servidor.
"use client";

import { useSyncExternalStore } from "react";
import type { Table } from "dexie";
import { getMeta, local, setMeta } from "./local-db";
import { TABLE_NAMES } from "./sync-schema";
import type { Base, Changes, TableName } from "./types";

export type SyncState = "idle" | "syncing" | "offline" | "error" | "auth";
type Status = { state: SyncState; lastSync: string | null; pending: number };

let status: Status = { state: "idle", lastSync: null, pending: 0 };
const listeners = new Set<() => void>();

function setStatus(patch: Partial<Status>) {
  status = { ...status, ...patch };
  listeners.forEach((l) => l());
}

export function useSyncStatus() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => status,
    () => status,
  );
}

const table = (t: TableName) => local[t] as unknown as Table<Base, string>;

function withoutDirty(r: Base): Base {
  const copy = { ...r };
  delete copy.dirty;
  return copy;
}

export async function countPending() {
  let n = 0;
  for (const t of TABLE_NAMES) n += await table(t).where("dirty").equals(1).count();
  return n;
}

async function push(): Promise<boolean> {
  const changes: Changes = {};
  let any = false;
  for (const t of TABLE_NAMES) {
    const dirty = await table(t).where("dirty").equals(1).toArray();
    if (dirty.length) {
      (changes as Record<string, Base[]>)[t] = dirty.map(withoutDirty);
      any = true;
    }
  }
  if (!any) return true;

  const res = await fetch("/api/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ changes }),
  });
  if (res.status === 401) {
    setStatus({ state: "auth" });
    return false;
  }
  if (!res.ok) throw new Error(`push ${res.status}`);

  // Só limpa a marca se o registro não foi editado de novo enquanto era enviado.
  for (const [t, records] of Object.entries(changes) as [TableName, Base[]][]) {
    await local.transaction("rw", table(t), async () => {
      for (const r of records) {
        const cur = await table(t).get(r.id);
        if (cur && cur.modifiedAt === r.modifiedAt) await table(t).update(r.id, { dirty: 0 });
      }
    });
  }
  return true;
}

async function pull() {
  const since = await getMeta<string>("lastPull");
  const res = await fetch(`/api/sync${since ? `?since=${encodeURIComponent(since)}` : ""}`);
  if (res.status === 401) {
    setStatus({ state: "auth" });
    return false;
  }
  if (!res.ok) throw new Error(`pull ${res.status}`);
  const data: { serverTime: string; changes: Changes } = await res.json();

  for (const t of TABLE_NAMES) {
    const incoming = (data.changes[t] ?? []) as Base[];
    if (!incoming.length) continue;
    await local.transaction("rw", table(t), async () => {
      const current = await table(t).bulkGet(incoming.map((r) => r.id));
      const toPut = incoming.filter((r, i) => {
        const cur = current[i];
        // Mantém a edição local pendente se ela for mais nova.
        return !cur || !cur.dirty || cur.modifiedAt <= r.modifiedAt;
      });
      await table(t).bulkPut(toPut.map((r) => ({ ...r, dirty: 0 as const })));
    });
  }
  await setMeta("lastPull", data.serverTime);
  return true;
}

let running: Promise<void> | null = null;
let again = false;

/** Sincroniza agora (se já estiver sincronizando, repete ao terminar). */
export function syncNow(): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    do {
      again = false;
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setStatus({ state: "offline", pending: await countPending() });
        return;
      }
      setStatus({ state: "syncing" });
      try {
        if ((await push()) && (await pull())) {
          const now = new Date().toISOString();
          await setMeta("lastSync", now);
          setStatus({ state: "idle", lastSync: now });
        }
      } catch (e) {
        // fetch lança TypeError quando não há rede (mesmo com navigator.onLine = true, ex.: Wi-Fi sem internet).
        setStatus({ state: e instanceof TypeError || !navigator.onLine ? "offline" : "error" });
      }
      setStatus({ pending: await countPending() });
    } while (again);
  })().finally(() => {
    running = null;
  });
  return running;
}

let timer: ReturnType<typeof setTimeout> | undefined;

/** Agenda uma sincronização logo após uma edição (agrupa edições seguidas). */
export function scheduleSync(delay = 1500) {
  clearTimeout(timer);
  timer = setTimeout(syncNow, delay);
  countPending().then((pending) => setStatus({ pending }));
}

export async function loadLastSync() {
  setStatus({ lastSync: (await getMeta<string>("lastSync")) ?? null, pending: await countPending() });
}

/** Apaga todos os dados do aparelho (usado ao sair). */
export async function clearLocalData() {
  await local.delete();
  if ("caches" in window) {
    for (const key of await caches.keys()) await caches.delete(key);
  }
}

"use client";

import { useEffect } from "react";
import Link from "next/link";
import { loadLastSync, syncNow, useSyncStatus } from "@/lib/sync-client";

/** Mantém os dados sincronizados enquanto o app está aberto e registra o modo offline. */
export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { state } = useSyncStatus();

  useEffect(() => {
    void loadLastSync().then(syncNow);
    const onFocus = () => document.visibilityState === "visible" && syncNow();
    window.addEventListener("online", syncNow);
    document.addEventListener("visibilitychange", onFocus);
    const interval = setInterval(syncNow, 60_000);

    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    return () => {
      window.removeEventListener("online", syncNow);
      document.removeEventListener("visibilitychange", onFocus);
      clearInterval(interval);
    };
  }, []);

  return (
    <>
      {state === "auth" && (
        <Link href="/login" className="card" style={{ borderColor: "var(--danger)", color: "var(--danger)" }}>
          Sua sessão expirou. Toque para entrar de novo — suas anotações feitas aqui estão guardadas.
        </Link>
      )}
      {children}
    </>
  );
}

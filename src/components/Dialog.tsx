"use client";

// Diálogos no estilo do app (no lugar do confirm/alert do navegador).
// Uso: `if (await confirmDialog({ title: "Excluir?", danger: true })) ...`

import { useEffect, useRef, useSyncExternalStore } from "react";
import styles from "./Dialog.module.css";

type Options = {
  title: string;
  message?: string;
  confirmLabel?: string;
  /** null = sem botão de cancelar (aviso simples). */
  cancelLabel?: string | null;
  danger?: boolean;
};
type Request = Options & { resolve: (ok: boolean) => void };

let current: Request | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function confirmDialog(options: Options): Promise<boolean> {
  current?.resolve(false);
  return new Promise((resolve) => {
    current = { ...options, resolve };
    emit();
  });
}

export async function alertDialog(title: string, message?: string) {
  await confirmDialog({ title, message, confirmLabel: "OK", cancelLabel: null });
}

function close(ok: boolean) {
  const req = current;
  current = null;
  emit();
  req?.resolve(ok);
}

/** Fica no layout e mostra o diálogo pedido no momento. */
export function DialogHost() {
  const req = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => null,
  );
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!req) return;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [req]);

  if (!req) return null;
  const cancelLabel = req.cancelLabel === undefined ? "Cancelar" : req.cancelLabel;

  return (
    <div className={styles.overlay} onClick={() => close(false)}>
      <div
        className={styles.sheet}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="dialog-title">{req.title}</h2>
        {req.message && <p className="soft">{req.message}</p>}
        <div className={styles.actions}>
          <button
            ref={confirmRef}
            className={`btn ${req.danger ? styles.danger : ""}`}
            onClick={() => close(true)}
          >
            {req.confirmLabel ?? "Confirmar"}
          </button>
          {cancelLabel && (
            <button className="btn secondary" onClick={() => close(false)}>
              {cancelLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

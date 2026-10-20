"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import {
  CalendarCheck,
  Camera,
  ChevronRight,
  Download,
  FileText,
  History,
  ListTree,
  LogOut,
  RefreshCw,
  Upload,
} from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { Loading, PageHeader, SavedField, Segmented } from "@/components/ui";
import { exportJson, exportMarkdown, importJson } from "@/lib/backup";
import { longestStudyStreak } from "@/lib/dates";
import { local } from "@/lib/local-db";
import { DEFAULT_PROFILE, hasContent, usePlan, useProfile, useStudiedDays } from "@/lib/plan";
import { put } from "@/lib/store";
import { clearLocalData, countPending, syncNow, useSyncStatus } from "@/lib/sync-client";
import type { Profile } from "@/lib/types";
import styles from "./more.module.css";
import { alertDialog, confirmDialog } from "@/components/Dialog";

async function saveProfile(fields: Partial<Profile>) {
  const current = (await local.profile.get("me")) ?? DEFAULT_PROFILE;
  await put("profile", { ...current, ...fields });
}

/** Recorta a foto no centro e reduz para 256×256 antes de guardar. */
async function resizePhoto(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = Object.assign(document.createElement("canvas"), { width: 256, height: 256 });
  canvas
    .getContext("2d")!
    .drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 256, 256);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export function MoreView() {
  const profile = useProfile();
  const loaded = useLiveQuery(() => local.profile.get("me").then((p) => p ?? null));
  const plan = usePlan();
  const studiedDays = useStudiedDays();
  const notes = useLiveQuery(() => local.notes.toArray());
  const messages = useLiveQuery(() => local.messages.toArray());
  const reviews = useLiveQuery(() => local.reviews.toArray());
  const sync = useSyncStatus();
  const photoInput = useRef<HTMLInputElement>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState("");

  if (loaded === undefined || !plan || !studiedDays || !notes || !messages || !reviews) return <Loading />;

  const total = plan.tracks.reduce((n, t) => n + t.chapters.length, 0);
  const read = plan.tracks.reduce((n, t) => n + t.read, 0);
  const stats = [
    { label: "capítulos lidos", value: `${read}/${total}` },
    { label: "dias de estudo", value: studiedDays.size },
    { label: "maior sequência de estudos", value: longestStudyStreak(studiedDays) },
    { label: "anotações", value: notes.filter((n) => hasContent(n)).length },
    { label: "sementes", value: notes.filter((n) => n.isSeed && !n.deletedAt).length },
    { label: "revisões", value: reviews.filter((r) => r.completedAt && !r.deletedAt).length },
    { label: "mensagens pregadas", value: messages.filter((m) => m.status === "preached" && !m.deletedAt).length },
  ];

  const onPhoto = async (file?: File) => {
    if (!file) return;
    try {
      await saveProfile({ photo: await resizePhoto(file) });
    } catch {
      await alertDialog("Não foi possível usar esta imagem", "Tente outra foto.");
    }
  };

  const onImport = async (file?: File) => {
    if (!file) return;
    const ok = await confirmDialog({
      title: "Importar este backup?",
      message: "Os registros do arquivo substituem os atuais que tiverem o mesmo conteúdo (capítulos, anotações, mensagens…).",
      confirmLabel: "Importar",
    });
    if (!ok) return;
    setBusy("Importando…");
    try {
      const n = await importJson(file);
      await alertDialog("Backup importado", `${n} registros restaurados.`);
    } catch (e) {
      await alertDialog("Não foi possível importar", e instanceof Error ? e.message : "Arquivo inválido.");
    } finally {
      setBusy("");
    }
  };

  const logout = async () => {
    await syncNow();
    const pending = await countPending();
    const ok = await confirmDialog(
      pending
        ? {
            title: "Há alterações não enviadas",
            message: `${pending} ${pending > 1 ? "alterações ainda não chegaram" : "alteração ainda não chegou"} ao servidor (sem conexão?). Se sair agora, ${pending > 1 ? "elas serão perdidas" : "ela será perdida"}.`,
            confirmLabel: "Sair e perder",
            cancelLabel: "Ficar",
            danger: true,
          }
        : {
            title: "Sair do Lâmpada?",
            message: "Os dados saem deste aparelho, mas continuam guardados no servidor.",
            confirmLabel: "Sair",
            danger: true,
          },
    );
    if (!ok) return;
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    await clearLocalData();
    window.location.href = "/login";
  };

  return (
    <>
      <PageHeader title="Mais" />

      <section className={`card ${styles.profile}`}>
        <button className={styles.photo} onClick={() => photoInput.current?.click()} aria-label="Trocar foto">
          <Avatar photo={profile.photo} size={72} />
          <span className={styles.camera}>
            <Camera size={14} />
          </span>
        </button>
        <input ref={photoInput} type="file" accept="image/*" hidden onChange={(e) => onPhoto(e.target.files?.[0])} />
        <div className="grow">
          <SavedField
            key={loaded ? "loaded" : "empty"}
            single
            label="Seu nome"
            value={profile.displayName}
            onSave={(displayName) => saveProfile({ displayName: displayName.trim() })}
          />
          {profile.photo && (
            <button className={`soft ${styles.removePhoto}`} onClick={() => saveProfile({ photo: null })}>
              Remover foto
            </button>
          )}
        </div>
      </section>

      <h2 className="section-title">Estatísticas</h2>
      <section className={styles.stats}>
        {stats.map((s) => (
          <div key={s.label} className="card">
            <strong>{s.value}</strong>
            <span className="soft">{s.label}</span>
          </div>
        ))}
      </section>

      <div className="list">
        <Link href="/historico">
          <History size={20} /> <span className="grow">Histórico de leitura</span> <ChevronRight size={16} className="soft" />
        </Link>
        <Link href="/revisao">
          <CalendarCheck size={20} /> <span className="grow">Revisão semanal</span> <ChevronRight size={16} className="soft" />
        </Link>
        <Link href="/plano?editar=1">
          <ListTree size={20} /> <span className="grow">Editar plano (fases e blocos)</span>{" "}
          <ChevronRight size={16} className="soft" />
        </Link>
      </div>

      <h2 className="section-title">Preferências</h2>
      <section className="card stack">
        <span className="soft">A semana começa no</span>
        <Segmented
          value={profile.weekStartsOn}
          onChange={(weekStartsOn) => saveProfile({ weekStartsOn })}
          options={[
            { value: 1, label: "Segunda" },
            { value: 0, label: "Domingo" },
          ]}
        />
      </section>

      <h2 className="section-title">Backup</h2>
      <div className="list">
        <button onClick={exportJson}>
          <Download size={20} /> <span className="grow">Exportar tudo (JSON, para restaurar)</span>
        </button>
        <button onClick={exportMarkdown}>
          <FileText size={20} /> <span className="grow">Exportar para ler (Markdown)</span>
        </button>
        <button onClick={() => importInput.current?.click()} disabled={!!busy}>
          <Upload size={20} /> <span className="grow">{busy || "Importar backup (JSON)"}</span>
        </button>
      </div>
      <input ref={importInput} type="file" accept="application/json,.json" hidden onChange={(e) => onImport(e.target.files?.[0])} />

      <h2 className="section-title">Sincronização</h2>
      <section className="card row">
        <span className="grow soft">
          {
            {
              idle: sync.lastSync ? `Sincronizado às ${new Date(sync.lastSync).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "Ainda não sincronizado",
              syncing: "Sincronizando…",
              offline: "Sem conexão — as alterações ficam guardadas aqui",
              error: "Erro ao sincronizar; tentando de novo em breve",
              auth: "Sessão expirada — entre de novo",
            }[sync.state]
          }
          {sync.pending > 0 && ` · ${sync.pending} pendente${sync.pending > 1 ? "s" : ""}`}
        </span>
        <button className="btn small secondary" onClick={() => syncNow()} aria-label="Sincronizar agora">
          <RefreshCw size={16} />
        </button>
      </section>

      <button className="btn danger" onClick={logout}>
        <LogOut size={18} /> Sair
      </button>
    </>
  );
}

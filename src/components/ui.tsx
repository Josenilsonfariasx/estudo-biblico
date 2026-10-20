"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Check, ChevronLeft } from "lucide-react";
import styles from "./ui.module.css";

export function PageHeader({
  title,
  subtitle,
  back,
  action,
}: {
  title: string;
  subtitle?: string;
  back?: string | true;
  action?: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <header className={styles.pageHeader}>
      {back &&
        (back === true ? (
          <button className={styles.back} onClick={() => router.back()} aria-label="Voltar">
            <ChevronLeft size={22} />
          </button>
        ) : (
          <Link className={styles.back} href={back} aria-label="Voltar">
            <ChevronLeft size={22} />
          </Link>
        ))}
      <div className={styles.titles}>
        <h1>{title}</h1>
        {subtitle && <p className="soft">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className={styles.progress} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Loading({ text = "Carregando…" }: { text?: string }) {
  return <p className={`soft ${styles.loading}`}>{text}</p>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className={`card soft ${styles.empty}`}>{children}</div>;
}

/** Checkbox grande de capítulo lido. */
export function ReadCheck({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      className={`${styles.check} ${checked ? styles.checked : ""}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onChange(!checked);
      }}
    >
      {checked && <Check size={18} strokeWidth={3} />}
    </button>
  );
}

/** Campo de texto que cresce conforme o conteúdo. */
export function Field({
  label,
  value,
  onChange,
  placeholder,
  rows = 2,
  single,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  single?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value]);

  return (
    <label className={styles.field}>
      <span>{label}</span>
      {single ? (
        <input
          value={value}
          placeholder={placeholder}
          inputMode={inputMode}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <textarea
          ref={ref}
          rows={rows}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className={styles.segmented} role="radiogroup">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          className={o.value === value ? styles.segActive : ""}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Estado local de um formulário com salvamento automático.
 * Cada alteração é gravada depois de uma pausa curta, e ao sair da tela.
 */
export function useAutosave<T extends object>(initial: T, save: (v: T) => Promise<void>, delay = 600) {
  const valueRef = useRef(initial);
  const dirtyRef = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(
    () => () => {
      clearTimeout(timer.current);
      if (dirtyRef.current) void saveRef.current(valueRef.current);
    },
    [],
  );

  return (next: T) => {
    valueRef.current = next;
    dirtyRef.current = true;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      dirtyRef.current = false;
      void saveRef.current(valueRef.current);
    }, delay);
  };
}

/** Campo que mantém o texto localmente e grava sozinho (para editar um único valor). */
export function SavedField({
  value,
  onSave,
  ...props
}: Omit<React.ComponentProps<typeof Field>, "value" | "onChange"> & {
  value: string;
  onSave: (v: string) => Promise<void> | void;
}) {
  const [text, setText] = useState(value);
  const save = useAutosave({ text }, async ({ text }) => {
    await onSave(text);
  });
  return (
    <Field
      {...props}
      value={text}
      onChange={(v) => {
        setText(v);
        save({ text: v });
      }}
    />
  );
}

export function MoveButtons({ onUp, onDown }: { onUp?: () => void; onDown?: () => void }) {
  return (
    <>
      <button className="btn small secondary" disabled={!onUp} onClick={onUp} aria-label="Mover para cima">
        <ArrowUp size={16} />
      </button>
      <button className="btn small secondary" disabled={!onDown} onClick={onDown} aria-label="Mover para baixo">
        <ArrowDown size={16} />
      </button>
    </>
  );
}

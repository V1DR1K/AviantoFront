"use client";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Info, Search, X } from "lucide-react";

export type ToastTone = "success" | "error" | "warning" | "info";
export type ToastState = { message: string; tone: ToastTone };
export type Notify = (message: string, tone?: ToastTone) => void;

function statusToneValue(status: string) {
  const s = status.toLowerCase();
  if (s.includes("cancel") || s.includes("no pag") || s.includes("correc")) return "danger";
  if (s.includes("aprob") || s.includes("pag") || s.includes("entreg") || s.includes("realiz") || s.includes("recibido")) return "success";
  if (s === "carga") return "info";
  if (s.includes("revisi")) return "violet";
  if (s.includes("parcial") || s.includes("para ") || s.includes("pedido") || s.includes("curso") || s.includes("taller") || s.includes("trabaj") || s.includes("proc")) return "warning";
  return "neutral";
}
const statusTone = (status: string) => `status-${statusToneValue(status)}`;

function StatusIcon({ status }: { status: string }) {
  const tone = statusToneValue(status);
  if (tone === "danger") return <AlertTriangle size={14} />;
  if (tone === "success") return <CheckCircle2 size={14} />;
  return <Clock3 size={14} />;
}

function useModalFocus(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLElement>(null);
  const prior = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!open) return;
    prior.current = document.activeElement as HTMLElement;
    const frame = requestAnimationFrame(() =>
      ref.current
        ?.querySelector<HTMLElement>(
          "button, input, select, textarea, [tabindex]:not([tabindex='-1'])",
        )
        ?.focus(),
    );
    return () => {
      cancelAnimationFrame(frame);
      prior.current?.focus();
    };
  }, [open]);
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = [
      ...(ref.current?.querySelectorAll<HTMLElement>(
        "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
      ) ?? []),
    ];
    if (!focusable.length) return;
    const first = focusable[0],
      last = focusable.at(-1)!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  return [ref, onKeyDown] as const;
}
export function StatusBadge({ status }: { status: string }) {
  const label = status === "Carga" ? "Ingresada" : status;
  return (
    <span className={`status ${statusTone(label)}`} data-status={label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}>
      <StatusIcon status={status} />
      {label}
    </span>
  );
}
export function SearchBox({
  value,
  onChange,
  placeholder = "Buscar...",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="search">
      <Search size={18} />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
      {value && (
        <button
          type="button"
          aria-label="Limpiar búsqueda"
          onClick={() => onChange("")}
        >
          <X size={16} />
        </button>
      )}
    </label>
  );
}
export function ConfirmModal({
  open,
  title,
  body,
  confirmLabel,
  variant = "danger",
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  variant?: "danger" | "success";
  onConfirm: () => void | Promise<unknown>;
  onClose: () => void;
}) {
  const [modalRef, onModalKeyDown] = useModalFocus(open, onClose);
  const [pending, setPending] = useState(false);
  if (!open) return null;
  const run = () => {
    if (pending) return;
    const result = onConfirm();
    if (result instanceof Promise) {
      setPending(true);
      void result.finally(() => setPending(false));
    }
  };
  return (
    <div className="modal-backdrop">
      <section
        ref={modalRef}
        onKeyDownCapture={onModalKeyDown}
        className="modal"
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby="confirm-title"
      >
        <button className="dialog-close" onClick={onClose} aria-label="Cerrar" disabled={pending}>
          <X size={20} />
        </button>
        <h2 id="confirm-title">{title}</h2>
        <p>{body}</p>
        <div className="modal-actions">
          <button className="button secondary" onClick={onClose} disabled={pending}>
            Cancelar
          </button>
          <button className={`button ${variant}`} onClick={run} disabled={pending}>
            {pending ? "Esperando..." : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
export function Dialog({
  open,
  title,
  children,
  onClose,
  wide = false,
  className = "",
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  className?: string;
}) {
  const [modalRef, onModalKeyDown] = useModalFocus(open, onClose);
  if (!open) return null;
  return (
    <div className="modal-backdrop">
      <section
        ref={modalRef}
        onKeyDownCapture={onModalKeyDown}
        className={`modal form-modal${wide ? " wide" : ""} ${className}`}
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        <button className="dialog-close" onClick={onClose} aria-label="Cerrar">
          <X size={20} />
        </button>
        <h2 id="dialog-title">{title}</h2>
        {children}
      </section>
    </div>
  );
}
export function Toast({
  notification,
  onClose,
}: {
  notification: ToastState | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!notification) return;
    const timer = window.setTimeout(onClose, 4000);
    return () => window.clearTimeout(timer);
  }, [notification, onClose]);
  if (!notification) return null;
  const Icon = notification.tone === "success"
    ? CheckCircle2
    : notification.tone === "error"
      ? AlertTriangle
      : notification.tone === "warning"
        ? Clock3
        : Info;
  return (
    <div className={`toast toast-${notification.tone}`} role={notification.tone === "error" ? "alert" : "status"}>
      <Icon size={18} aria-hidden="true" />
      <span>{notification.message}</span>
      <button onClick={onClose} aria-label="Cerrar notificación">
        <X size={16} />
      </button>
    </div>
  );
}
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-mark">—</div>
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}
export function Pagination({
  page,
  total,
  onPage,
}: {
  page: number;
  total: number;
  onPage: (page: number) => void;
}) {
  return (
    <div className="pagination">
      <span>
        Página {page} de {total}
      </span>
      <div>
        <button disabled={page === 1} onClick={() => onPage(page - 1)}>
          Anterior
        </button>
        <button disabled={page === total} onClick={() => onPage(page + 1)}>
          Siguiente
        </button>
      </div>
    </div>
  );
}

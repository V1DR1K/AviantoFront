"use client";
import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Search, X } from "lucide-react";
import type { OrderStatus } from "../lib/types";

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
export function StatusBadge({ status }: { status: OrderStatus }) {
  const icons = {
    "En proceso": Clock3,
    Aprobado: CheckCircle2,
    Pagado: CheckCircle2,
    Cancelado: AlertTriangle,
  };
  const Icon = icons[status];
  return (
    <span className={`status status-${status.toLowerCase().replace(" ", "-")}`}>
      <Icon size={14} />
      {status}
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
  onConfirm: () => void;
  onClose: () => void;
}) {
  const [modalRef, onModalKeyDown] = useModalFocus(open, onClose);
  if (!open) return null;
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
        <button className="dialog-close" onClick={onClose} aria-label="Cerrar">
          <X size={20} />
        </button>
        <h2 id="confirm-title">{title}</h2>
        <p>{body}</p>
        <div className="modal-actions">
          <button className="button secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className={`button ${variant}`} onClick={onConfirm}>
            {confirmLabel}
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
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const [modalRef, onModalKeyDown] = useModalFocus(open, onClose);
  if (!open) return null;
  return (
    <div className="modal-backdrop">
      <section
        ref={modalRef}
        onKeyDownCapture={onModalKeyDown}
        className={`modal form-modal${wide ? " wide" : ""}`}
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
  message,
  onClose,
}: {
  message: string | null;
  onClose: () => void;
}) {
  if (!message) return null;
  return (
    <div className="toast" role="status">
      <CheckCircle2 size={18} />
      <span>{message}</span>
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

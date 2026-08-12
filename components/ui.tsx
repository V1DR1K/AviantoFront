"use client";
import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { AlertTriangle, Check, CheckCircle2, ChevronDown, Clock3, Info, Search, SlidersHorizontal, X, type LucideIcon } from "lucide-react";
import { createPortal } from "react-dom";
import type { AutocompleteResponse } from "../lib/types";

export type ToastTone = "success" | "error" | "warning" | "info";
export type ToastState = { message: string; tone: ToastTone };
export type Notify = (message: string, tone?: ToastTone) => void;

function statusToneValue(status: string) {
  const s = status.toLowerCase();
  if (s.includes("cancel") || s.includes("no pag") || s.includes("correc")) return "danger";
  if (s.includes("aprob") || s.includes("pag") || s.includes("entreg") || s.includes("realiz") || s.includes("recibido")) return "success";
  if (s.includes("ingresada") || s === "cargada" || s === "disponible") return "info";
  if (s.includes("atrasad") || s.includes("sin service")) return "danger";
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
          "button, input, select:not(.select-native), textarea, [tabindex]:not([tabindex='-1'])",
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
        "button:not([disabled]), input:not([disabled]), select:not(.select-native):not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
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
  return (
    <span className={`status ${statusTone(status)}`} data-status={status.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}>
      <StatusIcon status={status} />
      {status}
    </span>
  );
}

export function FilterBar({
  children,
  primary,
  activeCount = 0,
  label = "Filtros",
}: {
  children: ReactNode;
  primary?: ReactNode;
  activeCount?: number;
  label?: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const controlsId = `filter-bar-${useId()}`;

  useEffect(() => {
    const media = window.matchMedia("(max-width: 680px)");
    const syncWithViewport = () => setCollapsed(media.matches);
    syncWithViewport();
    media.addEventListener("change", syncWithViewport);
    return () => media.removeEventListener("change", syncWithViewport);
  }, []);

  return (
    <div className={`filter-bar${collapsed ? " is-collapsed" : " is-expanded"}`}>
      <div className="filter-bar-head">
        {primary && <div className="filter-bar-primary">{primary}</div>}
        <button
          type="button"
          className="filter-bar-toggle"
          aria-controls={controlsId}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((value) => !value)}
        >
          <span className="filter-bar-toggle-label"><SlidersHorizontal size={17} aria-hidden="true" />{label}</span>
          {activeCount > 0 && <span className="filter-bar-count" aria-label={`${activeCount} filtros activos`}>{activeCount}</span>}
          <ChevronDown className="filter-bar-chevron" size={17} aria-hidden="true" />
        </button>
      </div>
      <div id={controlsId} className="filter-bar-controls" hidden={collapsed}>
        {children}
      </div>
    </div>
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

export type SelectOption = { value: string; label: string; disabled?: boolean };

export function SelectField({
  value,
  onChange,
  options,
  placeholder,
  label,
  icon: Icon,
  disabled = false,
  required = false,
  className = "",
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  label?: ReactNode;
  icon?: LucideIcon;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  const controlRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [menuPosition, setMenuPosition] = useState<CSSProperties | null>(null);
  const fieldId = useId();
  const menuId = `${fieldId}-options`;
  const selectedOption = options.find((option) => option.value === value);
  const firstEnabledIndex = options.findIndex((option) => !option.disabled);
  const selectedIndex = options.findIndex((option) => option.value === value && !option.disabled);
  const optionId = (index: number) => `${menuId}-${index}`;
  const moveHighlight = (direction: 1 | -1) => {
    if (!options.length) return;
    let next = highlightedIndex;
    for (let step = 0; step < options.length; step += 1) {
      next = (next + direction + options.length) % options.length;
      if (!options[next].disabled) {
        setHighlightedIndex(next);
        return;
      }
    }
  };
  const openMenu = () => {
    if (disabled || !options.length) return;
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : firstEnabledIndex >= 0 ? firstEnabledIndex : 0);
    setOpen(true);
  };
  const closeMenu = (restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  };
  const choose = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange(option.value);
    closeMenu(true);
  };

  useEffect(() => {
    if (!open) return;
    const updateMenuPosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const estimatedHeight = Math.min(280, options.length * 42 + 10);
      const openAbove = window.innerHeight - rect.bottom < estimatedHeight && rect.top > estimatedHeight;
      setMenuPosition({
        position: "fixed",
        left: rect.left,
        width: Math.max(rect.width, 190),
        top: openAbove ? "auto" : rect.bottom + 7,
        bottom: openAbove ? window.innerHeight - rect.top + 7 : "auto",
      });
    };
    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
      setMenuPosition(null);
    };
  }, [open, options.length]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!controlRef.current?.contains(target) && !menuRef.current?.contains(target)) closeMenu();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>(`[data-option-index="${highlightedIndex}"]`)?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex, open]);

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) return openMenu();
      moveHighlight(event.key === "ArrowDown" ? 1 : -1);
    } else if (event.key === "Home" && open) {
      event.preventDefault();
      if (firstEnabledIndex >= 0) setHighlightedIndex(firstEnabledIndex);
    } else if (event.key === "End" && open) {
      event.preventDefault();
      const lastEnabledIndex = options.findLastIndex((option) => !option.disabled);
      if (lastEnabledIndex >= 0) setHighlightedIndex(lastEnabledIndex);
    } else if ((event.key === "Enter" || event.key === " ") && !open) {
      event.preventDefault();
      openMenu();
    } else if ((event.key === "Enter" || event.key === " ") && open) {
      event.preventDefault();
      choose(highlightedIndex);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      closeMenu(true);
    } else if (event.key === "Tab") {
      closeMenu();
    }
  };

  const control = (
    <div ref={controlRef} className={`select-control${open ? " is-open" : ""}${disabled ? " is-disabled" : ""}`}>
      {Icon && <Icon size={16} aria-hidden="true" />}
      <button
        ref={triggerRef}
        type="button"
        className="select-trigger"
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        aria-activedescendant={open ? optionId(highlightedIndex) : undefined}
        aria-required={required}
        disabled={disabled}
        onClick={() => open ? closeMenu() : openMenu()}
        onKeyDown={onTriggerKeyDown}
      >
        <span className={!selectedOption ? "select-placeholder" : undefined}>{selectedOption?.label ?? placeholder ?? "Seleccionar"}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      <select
        className="select-native"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        required={required}
        tabIndex={-1}
        aria-hidden="true"
        onInvalid={(event) => {
          event.preventDefault();
          triggerRef.current?.focus();
          setOpen(true);
        }}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      {open && menuPosition && typeof document !== "undefined" && createPortal(
        <div ref={menuRef} id={menuId} className="select-menu suggestions" style={menuPosition} role="listbox" aria-label={ariaLabel}>
          {options.map((option, index) => (
            <button
              key={option.value}
              type="button"
              role="option"
              tabIndex={-1}
              data-option-index={index}
              id={optionId(index)}
              aria-selected={option.value === value}
              disabled={option.disabled}
              className={`${option.value === value ? "selected" : ""}${index === highlightedIndex ? " highlighted" : ""}`}
              onMouseEnter={() => setHighlightedIndex(index)}
              onClick={() => choose(index)}
            >
              <span>{option.label}</span>
              {option.value === value && <Check size={16} aria-hidden="true" />}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
  return label ? <div className={`select-field ${className}`}><span className="select-label">{label}</span>{control}</div> : control;
}

export function AutocompleteField({
  value,
  onChange,
  onSelect,
  onClear,
  options,
  loadOptions,
  selected = null,
  placeholder = "Buscar...",
  minChars = 2,
  disabled = false,
  emptyText = "Sin coincidencias.",
  loadingText = "Buscando...",
  className = "",
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  onSelect: (option: AutocompleteResponse) => void;
  onClear?: () => void;
  options?: AutocompleteResponse[];
  loadOptions?: (query: string) => Promise<AutocompleteResponse[]>;
  selected?: AutocompleteResponse | null;
  placeholder?: string;
  minChars?: number;
  disabled?: boolean;
  emptyText?: string;
  loadingText?: string;
  className?: string;
  ariaLabel?: string;
}) {
  const [suggestions, setSuggestions] = useState<AutocompleteResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const query = value.trim();
  const localSuggestions = !selected && !loadOptions && query.length >= minChars
    ? (options ?? []).filter((item) => `${item.label} ${item.secondary ?? ""}`.toLowerCase().includes(query.toLowerCase())).slice(0, 10)
    : [];
  const visibleSuggestions = loadOptions ? suggestions : localSuggestions;

  useEffect(() => {
    if (selected || query.length < minChars || !loadOptions) return;
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      void loadOptions(query)
        .then((items) => { if (active) setSuggestions(items); })
        .catch(() => { if (active) setSuggestions([]); })
        .finally(() => { if (active) setLoading(false); });
    }, 180);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [loadOptions, minChars, query, selected]);

  const clear = () => {
    onClear?.();
    onChange("");
    setSuggestions([]);
  };
  return (
    <div className={`autocomplete-field ${className}`}>
      <Search size={17} aria-hidden="true" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-autocomplete="list"
      />
      {value && <button type="button" className="icon-button" aria-label="Limpiar selección" onClick={clear}><X size={16} /></button>}
      {!selected && query.length >= minChars && (loading || visibleSuggestions.length > 0 || Boolean(options && !loadOptions)) && (
        <div className="suggestions" role="listbox">
          {loading ? <p className="suggestions-empty">{loadingText}</p> : visibleSuggestions.length ? visibleSuggestions.map((item) => (
            <button type="button" key={item.id} role="option" aria-selected="false" onClick={() => { onSelect(item); setSuggestions([]); }}>
              <span>{item.label}</span>
              <small>{item.secondary ?? ""}</small>
            </button>
          )) : <p className="suggestions-empty">{emptyText}</p>}
        </div>
      )}
    </div>
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
  const titleId = useId();
  if (!open) return null;
  const run = () => {
    if (pending) return;
    setPending(true);
    void Promise.resolve().then(onConfirm).catch(() => undefined).finally(() => setPending(false));
  };
  return (
    <div className="modal-backdrop">
      <section
        ref={modalRef}
        onKeyDownCapture={(event) => {
          if ((event.target as HTMLElement).closest(".confirm-modal")) return;
          onModalKeyDown(event);
        }}
        className="modal confirm-modal"
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="modal-header">
          <h2 id={titleId}>{title}</h2>
          <button className="dialog-close" onClick={onClose} aria-label="Cerrar" disabled={pending}>
            <X size={19} />
          </button>
        </header>
        <div className="modal-content">
          <p>{body}</p>
          <div className="modal-actions">
            <button className="button secondary" onClick={onClose} disabled={pending}>
              Cancelar
            </button>
            <button className={`button ${variant}`} onClick={run} disabled={pending}>
              {pending ? "Esperando..." : confirmLabel}
            </button>
          </div>
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
  dirty = false,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  className?: string;
  dirty?: boolean;
}) {
  const [discardOpen, setDiscardOpen] = useState(false);
  const requestClose = () => {
    if (dirty) {
      setDiscardOpen(true);
      return;
    }
    onClose();
  };
  const [modalRef, onModalKeyDown] = useModalFocus(open, requestClose);
  const titleId = useId();
  if (!open) return null;
  return (
    <div role="presentation" className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) requestClose(); }}>
      <section
        ref={modalRef}
        onKeyDownCapture={(event) => {
          if ((event.target as HTMLElement).closest(".confirm-modal")) {
            event.stopPropagation();
            return;
          }
          onModalKeyDown(event);
        }}
        className={`modal form-modal${wide ? " wide" : ""} ${className}`}
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="modal-header">
          <h2 id={titleId}>{title}</h2>
          <button className="dialog-close" onClick={requestClose} aria-label="Cerrar">
            <X size={19} />
          </button>
        </header>
        <div className="modal-content">{children}</div>
      </section>
      <ConfirmModal
        open={discardOpen}
        title="¿Descartar cambios?"
        body="Si cerrás ahora, se perderán los cambios que todavía no guardaste."
        confirmLabel="Descartar cambios"
        onClose={() => setDiscardOpen(false)}
        onConfirm={() => { setDiscardOpen(false); onClose(); }}
      />
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

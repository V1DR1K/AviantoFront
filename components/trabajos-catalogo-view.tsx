"use client";

import { useEffect, useState } from "react";
import { Edit3, Eye, Filter, Plus, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import { money, parsePrice } from "../lib/format";
import type { TrabajoCatalogoResponse } from "../lib/types";
import { AbmFormModal } from "./modal/abm-form-modal";
import { ConfirmModal, Dialog, EmptyState, FilterBar, LoadingState, SearchBox, SelectField, type Notify } from "./ui";
import { AviantoRecordList } from "./avianto-records";
import { AviantoPage, AviantoPageHeader, AviantoPanel } from "./avianto-layout";

const errorMessage = (reason: unknown) => reason instanceof Error ? reason.message : "No fue posible cargar los trabajos.";

export function TrabajosCatalogoView({ notify }: { notify: Notify }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Todos");
  const [rows, setRows] = useState<TrabajoCatalogoResponse[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<TrabajoCatalogoResponse | null>(null);
  const [detail, setDetail] = useState<TrabajoCatalogoResponse | null>(null);
  const [deleting, setDeleting] = useState<TrabajoCatalogoResponse | null>(null);
  const load = (signal?: AbortSignal) => {
    const controller = signal ? null : new AbortController();
    const requestSignal = signal ?? controller?.signal;
    void api<TrabajoCatalogoResponse[]>("/configuracion/trabajos", { signal: requestSignal }, {
      q: query || undefined,
      activo: filter === "Todos" ? undefined : filter === "Activo",
    }).then((next) => { setRows(next); setLoaded(true); setLoadError(null); }).catch((reason) => { if (!requestSignal?.aborted) { setLoadError(errorMessage(reason)); notify(errorMessage(reason), "error"); } });
    return () => controller?.abort();
  };
  useEffect(load, [query, filter, notify]);
  const submit = async (values: Record<string, string>) => {
    try {
      await api(`/configuracion/trabajos${editing?.id ? `/${editing.id}` : ""}`, {
        method: editing?.id ? "PUT" : "POST",
        body: JSON.stringify({ descripcion: values.descripcion, precioBase: parsePrice(values.precioBase) }),
      });
      setEditing(null);
      load();
      notify(`Trabajo ${editing ? "actualizado" : "creado"}.`);
    } catch (reason) { notify(errorMessage(reason), "error"); }
  };
  return <AviantoPage className="work-catalog-page">
    <AviantoPageHeader title="Trabajos" description="Precios de referencia para presupuestar las fichas del taller." actions={<button className="button primary" onClick={() => setEditing({ id: "", descripcion: "", precioBase: 0, activo: true })}><Plus size={19} />Nuevo trabajo</button>} />
    <AviantoPanel className="record-list-panel work-catalog-record-list-panel">
      <div className="panel-head"><div><h2>Precios de referencia</h2><p>Valores sugeridos para presupuestos de taller.</p></div></div>
       <FilterBar primary={<SearchBox value={query} onChange={setQuery} placeholder="Buscar por descripción" />} activeCount={filter !== "Todos" ? 1 : 0}>
          <SelectField value={filter} onChange={setFilter} options={[{ value: "Activo", label: "Activo" }, { value: "Inactivo", label: "Inactivo" }]} placeholder="Todos" icon={Filter} ariaLabel="Filtrar trabajos por estado" />
       </FilterBar>
      {loadError ? <EmptyState title="No se pudieron cargar los trabajos" body={loadError} action={<button className="button secondary" onClick={() => load()}>Reintentar</button>} /> : !loaded ? <LoadingState label="Cargando trabajos..." /> : rows.length ? <AviantoRecordList label="Trabajos" records={rows.map((row) => ({
        id: row.id, title: row.descripcion, fields: [
          { label: "Precio sugerido", value: money(row.precioBase) },
          { label: "Estado", value: <span className={`record-state ${row.activo ? "active" : "inactive"}`}>{row.activo ? "Activo" : "Inactivo"}</span> },
        ], actions: <><button type="button" className="text-button" onClick={() => setDetail(row)} aria-label={`Ver trabajo ${row.descripcion}`}><Eye size={17} />Ver detalle</button><button type="button" className="text-button secondary" onClick={() => setEditing(row)} aria-label={`Editar trabajo ${row.descripcion}`}><Edit3 size={17} />Editar</button><button type="button" className="text-button danger-action" onClick={() => setDeleting(row)} aria-label={`Eliminar trabajo ${row.descripcion}`}><Trash2 size={17} />Eliminar</button></>,
      }))} /> : <EmptyState title="No hay trabajos para mostrar" body="Creá un trabajo o ajustá los filtros." action={<button className="button primary" onClick={() => setEditing({ id: "", descripcion: "", precioBase: 0, activo: true })}>Nuevo trabajo</button>} />}
    </AviantoPanel>
     <AbmFormModal key={editing?.id || "new"} open={editing !== null} resource="trabajo" mode={editing?.id ? "modificar" : "agregar"} initialValues={editing ?? {}} fields={[{ key: "descripcion", label: "Descripción", required: true, wide: true }, { key: "precioBase", label: "Precio sugerido", type: "currency", required: true }]} onClose={() => setEditing(null)} onSubmit={submit} onError={(message) => notify(message, "error")} />
    <Dialog open={detail !== null} title="Detalle del trabajo" onClose={() => setDetail(null)}><dl className="record-detail"><div><dt>Descripción</dt><dd>{detail?.descripcion}</dd></div><div><dt>Precio sugerido</dt><dd>{detail ? money(detail.precioBase) : "—"}</dd></div><div><dt>Estado</dt><dd>{detail?.activo ? "Activo" : "Inactivo"}</dd></div></dl><div className="modal-actions"><button className="button secondary" onClick={() => setDetail(null)}>Cerrar</button><button className="button primary" onClick={() => { setEditing(detail); setDetail(null); }}>Editar</button></div></Dialog>
     <ConfirmModal open={deleting !== null} title="Eliminar trabajo" body={`Vas a dar de baja "${deleting?.descripcion ?? ""}". No se sugerirá en nuevas fichas, pero los trabajos históricos se conservarán.`} confirmLabel="Eliminar trabajo" onClose={() => setDeleting(null)} onConfirm={async () => { const selected = deleting; if (!selected) return; setDeleting(null); try { await api(`/configuracion/trabajos/${selected.id}`, { method: "DELETE" }); load(); notify("Trabajo eliminado correctamente."); } catch (reason) { notify(errorMessage(reason), "error"); } }} />
  </AviantoPage>;
}

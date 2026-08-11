"use client";

import { useEffect, useState } from "react";
import { Edit3, Eye, Filter, Plus, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import { money, parsePrice } from "../lib/format";
import type { TrabajoCatalogoResponse } from "../lib/types";
import { AbmFormModal } from "./modal/abm-form-modal";
import { ConfirmModal, Dialog, EmptyState, SearchBox, SelectField, type Notify } from "./ui";

const errorMessage = (reason: unknown) => reason instanceof Error ? reason.message : "No fue posible cargar los trabajos.";

export function TrabajosCatalogoView({ notify }: { notify: Notify }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Todos");
  const [rows, setRows] = useState<TrabajoCatalogoResponse[]>([]);
  const [editing, setEditing] = useState<TrabajoCatalogoResponse | null>(null);
  const [detail, setDetail] = useState<TrabajoCatalogoResponse | null>(null);
  const [deleting, setDeleting] = useState<TrabajoCatalogoResponse | null>(null);
  const load = () => {
    void api<TrabajoCatalogoResponse[]>("/configuracion/trabajos", {}, {
      q: query || undefined,
      activo: filter === "Todos" ? undefined : filter === "Activo",
    }).then(setRows).catch((reason) => notify(errorMessage(reason), "error"));
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
  return <div className="page">
    <div className="page-heading">
      <div><h1>Trabajos</h1><p>Precios de referencia para presupuestar las fichas del taller.</p></div>
      <button className="button primary" onClick={() => setEditing({ id: "", descripcion: "", precioBase: 0, activo: true })}><Plus size={19} />Nuevo trabajo</button>
    </div>
    <section className="panel table-panel">
      <div className="filter-bar">
        <SearchBox value={query} onChange={setQuery} placeholder="Buscar por descripción" />
         <SelectField value={filter} onChange={setFilter} options={[{ value: "Activo", label: "Activo" }, { value: "Inactivo", label: "Inactivo" }]} placeholder="Todos" icon={Filter} ariaLabel="Filtrar trabajos por estado" />
      </div>
      {rows.length ? <table><thead><tr><th>Descripción</th><th>Precio sugerido</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
        {rows.map((row) => <tr key={row.id}><td data-label="Descripción"><strong>{row.descripcion}</strong></td><td data-label="Precio sugerido">{money(row.precioBase)}</td><td data-label="Estado"><span className={`record-state ${row.activo ? "active" : "inactive"}`}>{row.activo ? "Activo" : "Inactivo"}</span></td><td className="table-actions"><button onClick={() => setDetail(row)} aria-label={`Ver trabajo ${row.descripcion}`}><Eye size={17} /></button><button onClick={() => setEditing(row)} aria-label={`Editar trabajo ${row.descripcion}`}><Edit3 size={17} /></button><button className="danger-action" onClick={() => setDeleting(row)} aria-label={`Eliminar trabajo ${row.descripcion}`}><Trash2 size={17} /></button></td></tr>)}
      </tbody></table> : <EmptyState title="No hay trabajos para mostrar" body="Creá un trabajo o ajustá los filtros." action={<button className="button primary" onClick={() => setEditing({ id: "", descripcion: "", precioBase: 0, activo: true })}>Nuevo trabajo</button>} />}
    </section>
     <AbmFormModal key={editing?.id || "new"} open={editing !== null} resource="trabajo" mode={editing?.id ? "modificar" : "agregar"} initialValues={editing ?? {}} fields={[{ key: "descripcion", label: "Descripción", required: true, wide: true }, { key: "precioBase", label: "Precio sugerido", type: "currency", required: true }]} onClose={() => setEditing(null)} onSubmit={submit} onError={(message) => notify(message, "error")} />
    <Dialog open={detail !== null} title="Detalle del trabajo" onClose={() => setDetail(null)}><dl className="record-detail"><div><dt>Descripción</dt><dd>{detail?.descripcion}</dd></div><div><dt>Precio sugerido</dt><dd>{detail ? money(detail.precioBase) : "—"}</dd></div><div><dt>Estado</dt><dd>{detail?.activo ? "Activo" : "Inactivo"}</dd></div></dl><div className="modal-actions"><button className="button secondary" onClick={() => setDetail(null)}>Cerrar</button><button className="button primary" onClick={() => { setEditing(detail); setDetail(null); }}>Editar</button></div></Dialog>
     <ConfirmModal open={deleting !== null} title="Eliminar trabajo" body={`Vas a dar de baja "${deleting?.descripcion ?? ""}". No se sugerirá en nuevas fichas, pero los trabajos históricos se conservarán.`} confirmLabel="Eliminar trabajo" onClose={() => setDeleting(null)} onConfirm={async () => { const selected = deleting; if (!selected) return; setDeleting(null); try { await api(`/configuracion/trabajos/${selected.id}`, { method: "DELETE" }); load(); notify("Trabajo eliminado correctamente."); } catch (reason) { notify(errorMessage(reason), "error"); } }} />
  </div>;
}

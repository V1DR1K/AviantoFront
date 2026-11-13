"use client";

import { useEffect, useState } from "react";
import { usePermission } from "./permissions-context";
import { Edit3, Eye, Filter, Plus, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import { money, parsePrice } from "../lib/format";
import type { TrabajoCatalogoResponse } from "../lib/types";
import { AbmFormModal } from "./modal/abm-form-modal";
import { ConfirmModal, Dialog, EmptyState, FilterBar, LoadingState, SearchBox, SelectField, type Notify } from "./ui";
import { AviantoRecordList } from "./avianto-records";
import { AviantoPage, AviantoPageHeader, AviantoPanel } from "./avianto-layout";

const errorMessage = (reason: unknown) => reason instanceof Error ? reason.message : "No fue posible cargar los trabajos.";
type PriceScope = "CERRADAS" | "ABIERTAS";

export function TrabajosCatalogoView({ notify }: { notify: Notify }) {
  const can = usePermission();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Todos");
  const [rows, setRows] = useState<TrabajoCatalogoResponse[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<TrabajoCatalogoResponse | null>(null);
  const [priceScopes, setPriceScopes] = useState<Set<PriceScope>>(new Set());
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
      const payload = { descripcion: values.descripcion, precioBase: parsePrice(values.precioBase) };
      if (editing?.id) {
        const priceChanged = Math.round(payload.precioBase * 100) !== Math.round(Number(editing.precioBase) * 100);
        const result = await api<TrabajoCatalogoResponse>(`/configuracion/trabajos/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify({ ...payload, actualizarEnFichas: priceChanged ? [...priceScopes] : [] }),
        });
        setEditing(null);
        setPriceScopes(new Set());
        load();
        if (priceChanged) {
          const trabajosActualizados = result.trabajosActualizados ?? 0;
          const fichasActualizadas = result.fichasActualizadas ?? 0;
          const applied = trabajosActualizados > 0
            ? `Precio aplicado a ${trabajosActualizados} trabajos en ${fichasActualizadas} fichas existentes.`
            : "No se modificaron fichas existentes.";
          const future = editing.activo
            ? "Las fichas futuras que seleccionen este trabajo tomarán el precio nuevo."
            : "El trabajo está inactivo; su precio quedó actualizado en el catálogo.";
          notify(`${applied} ${future}`);
        } else {
          notify("Trabajo actualizado.");
        }
        return;
      }
      await api("/configuracion/trabajos", { method: "POST", body: JSON.stringify(payload) });
      setEditing(null);
      setPriceScopes(new Set());
      load();
      notify("Trabajo creado.");
    } catch (reason) { notify(errorMessage(reason), "error"); }
  };
  return <AviantoPage className="work-catalog-page">
    <AviantoPageHeader title="Trabajos" description="Precios de referencia para presupuestar las fichas del taller." actions={(can("trabajos.crear") ? <button className="button primary" onClick={() => { setPriceScopes(new Set()); setEditing({ id: "", descripcion: "", precioBase: 0, activo: true }); }}><Plus size={19} />Nuevo trabajo</button> : null)} />
    <AviantoPanel className="record-list-panel work-catalog-record-list-panel">
      <div className="panel-head"><div><h2>Precios de referencia</h2><p>Valores sugeridos para presupuestos de taller.</p></div></div>
       <FilterBar primary={<SearchBox value={query} onChange={setQuery} placeholder="Buscar por descripción" />} activeCount={filter !== "Todos" ? 1 : 0}>
          <SelectField value={filter} onChange={setFilter} options={[{ value: "Activo", label: "Activo" }, { value: "Inactivo", label: "Inactivo" }]} placeholder="Todos" icon={Filter} ariaLabel="Filtrar trabajos por estado" />
       </FilterBar>
      {loadError ? <EmptyState title="No se pudieron cargar los trabajos" body={loadError} action={<button className="button secondary" onClick={() => load()}>Reintentar</button>} /> : !loaded ? <LoadingState label="Cargando trabajos..." /> : rows.length ? <AviantoRecordList label="Trabajos" records={rows.map((row) => ({
        id: row.id, title: row.descripcion, fields: [
          { label: "Precio sugerido", value: money(row.precioBase) },
          { label: "Estado", value: <span className={`record-state ${row.activo ? "active" : "inactive"}`}>{row.activo ? "Activo" : "Inactivo"}</span> },
        ], actions: <><button type="button" className="text-button" onClick={() => setDetail(row)} aria-label={`Ver trabajo ${row.descripcion}`}><Eye size={17} />Ver detalle</button>{can("trabajos.editar") && <button type="button" className="text-button secondary" onClick={() => { setPriceScopes(new Set()); setEditing(row); }} aria-label={`Editar trabajo ${row.descripcion}`}><Edit3 size={17} />Editar</button>}{can("trabajos.eliminar") && <button type="button" className="text-button danger-action" onClick={() => setDeleting(row)} aria-label={`Eliminar trabajo ${row.descripcion}`}><Trash2 size={17} />Eliminar</button>}</>,
      }))} /> : <EmptyState title="No hay trabajos para mostrar" body="Creá un trabajo o ajustá los filtros." action={(can("trabajos.crear") ? <button className="button primary" onClick={() => setEditing({ id: "", descripcion: "", precioBase: 0, activo: true })}>Nuevo trabajo</button> : null)} />}
    </AviantoPanel>
     <AbmFormModal key={editing?.id || "new"} open={editing !== null} resource="trabajo" mode={editing?.id ? "modificar" : "agregar"} initialValues={editing ?? {}} fields={[{ key: "descripcion", label: "Descripción", required: true, wide: true }, { key: "precioBase", label: "Precio sugerido", type: "currency", required: true }]} extra={editing?.id ? <fieldset className="work-price-scopes"><legend>Al cambiar el precio</legend>
       <label className="work-price-scope"><input type="checkbox" checked={priceScopes.has("CERRADAS")} onChange={(event) => setPriceScopes((current) => { const next = new Set(current); event.target.checked ? next.add("CERRADAS") : next.delete("CERRADAS"); return next; })} /><span><strong>Fichas anteriores</strong><small>Terminadas, entregadas o canceladas.</small></span></label>
       <label className="work-price-scope"><input type="checkbox" checked={priceScopes.has("ABIERTAS")} onChange={(event) => setPriceScopes((current) => { const next = new Set(current); event.target.checked ? next.add("ABIERTAS") : next.delete("ABIERTAS"); return next; })} /><span><strong>Fichas activas/abiertas</strong><small>Pendientes, en proceso o en revisión.</small></span></label>
       <div className="work-price-scope work-price-scope-future"><span><strong>Fichas futuras</strong><small>{editing?.activo ? "Las fichas nuevas que seleccionen este trabajo tomarán automáticamente el precio vigente." : "Este trabajo está inactivo y no aparece en sugerencias; al activarlo, las fichas nuevas usarán este precio."}</small></span><span className="work-price-auto">Automático</span></div>
       <p className="work-price-scope-note">Las opciones anteriores se aplican cuando guardás un precio distinto y buscan el trabajo por su descripción. Se conservan descuentos; si el nuevo total queda por debajo de lo ya cobrado, no se aplica la actualización.</p>
     </fieldset> : undefined} extraDirty={priceScopes.size > 0} onClose={() => { setEditing(null); setPriceScopes(new Set()); }} onSubmit={submit} onError={(message) => notify(message, "error")} />
    <Dialog open={detail !== null} title="Detalle del trabajo" onClose={() => setDetail(null)}><dl className="record-detail"><div><dt>Descripción</dt><dd>{detail?.descripcion}</dd></div><div><dt>Precio sugerido</dt><dd>{detail ? money(detail.precioBase) : "—"}</dd></div><div><dt>Estado</dt><dd>{detail?.activo ? "Activo" : "Inactivo"}</dd></div></dl><div className="modal-actions"><button className="button secondary" onClick={() => setDetail(null)}>Cerrar</button><button className="button primary" onClick={() => { setPriceScopes(new Set()); setEditing(detail); setDetail(null); }}>Editar</button></div></Dialog>
     <ConfirmModal open={deleting !== null} title="Eliminar trabajo" body={`Vas a dar de baja "${deleting?.descripcion ?? ""}". No se sugerirá en nuevas fichas, pero los trabajos históricos se conservarán.`} confirmLabel="Eliminar trabajo" onClose={() => setDeleting(null)} onConfirm={async () => { const selected = deleting; if (!selected) return; setDeleting(null); try { await api(`/configuracion/trabajos/${selected.id}`, { method: "DELETE" }); load(); notify("Trabajo eliminado correctamente."); } catch (reason) { notify(errorMessage(reason), "error"); } }} />
  </AviantoPage>;
}

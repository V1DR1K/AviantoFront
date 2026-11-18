"use client";

import { useEffect, useState } from "react";
import { usePermission } from "./permissions-context";
import { Edit3, Eye, Filter, Plus, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import { money, parsePrice } from "../lib/format";
import type { TrabajoCatalogoResponse, TrabajoSugerenciaResponse } from "../lib/types";
import { AbmFormModal } from "./modal/abm-form-modal";
import { ConfirmModal, Dialog, EmptyState, FilterBar, LoadingState, SearchBox, SelectField, type Notify } from "./ui";
import { AviantoRecordList } from "./avianto-records";
import { AviantoPage, AviantoPageHeader, AviantoPanel } from "./avianto-layout";

const errorMessage = (reason: unknown) => reason instanceof Error ? reason.message : "No fue posible cargar los trabajos.";
// Dos alternativas únicas: no tocar ninguna ficha (por defecto) o aplicar el precio a las fichas vigentes
// (Pendiente, En proceso, En revisión y Terminada). Entregadas y canceladas nunca cambian.
type PriceScope = "NO_MODIFICAR" | "FICHAS_VIGENTES";

export function TrabajosCatalogoView({ notify }: { notify: Notify }) {
  const can = usePermission();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Todos");
  const [rows, setRows] = useState<TrabajoCatalogoResponse[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<TrabajoCatalogoResponse | null>(null);
  const [priceScope, setPriceScope] = useState<PriceScope>("NO_MODIFICAR");
  const [detail, setDetail] = useState<TrabajoCatalogoResponse | null>(null);
  const [deleting, setDeleting] = useState<TrabajoCatalogoResponse | null>(null);
  const [suggestions, setSuggestions] = useState<TrabajoSugerenciaResponse[] | null>(null);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [suggestionReload, setSuggestionReload] = useState(0);
  const [suggestionMode, setSuggestionMode] = useState(false);
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
  useEffect(() => {
    const controller = new AbortController();
    void api<TrabajoSugerenciaResponse[]>("/configuracion/trabajos/sugerencias", { signal: controller.signal })
      .then((next) => { setSuggestions(next); setSuggestionError(null); })
      .catch((reason) => { if (!controller.signal.aborted) setSuggestionError(errorMessage(reason)); });
    return () => controller.abort();
  }, [suggestionReload]);
  const submit = async (values: Record<string, string>) => {
    try {
      const payload = { descripcion: values.descripcion, precioBase: parsePrice(values.precioBase) };
      if (suggestionMode && payload.precioBase <= 0) {
        notify("Ingresá un precio base mayor que cero para agregar esta sugerencia.", "error");
        return;
      }
      if (editing?.id) {
        const priceChanged = Math.round(payload.precioBase * 100) !== Math.round(Number(editing.precioBase) * 100);
        const result = await api<TrabajoCatalogoResponse>(`/configuracion/trabajos/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify({ ...payload, alcanceFichas: priceChanged ? priceScope : "NO_MODIFICAR" }),
        });
        setEditing(null);
        setPriceScope("NO_MODIFICAR");
        load();
        if (priceChanged) {
          const trabajosActualizados = result.trabajosActualizados ?? 0;
          const fichasActualizadas = result.fichasActualizadas ?? 0;
          const applied = priceScope === "FICHAS_VIGENTES" && trabajosActualizados > 0
            ? `Precio aplicado a ${trabajosActualizados} trabajos en ${fichasActualizadas} fichas vigentes.`
            : "No se modificó ninguna ficha.";
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
      setSuggestionMode(false);
      setPriceScope("NO_MODIFICAR");
      load();
      setSuggestionReload((value) => value + 1);
      notify("Trabajo creado.");
    } catch (reason) { notify(errorMessage(reason), "error"); }
  };
  return <AviantoPage className="work-catalog-page">
    <AviantoPageHeader title="Trabajos" description="Precios de referencia para presupuestar las fichas del taller." actions={(can("trabajos.crear") ? <button className="button primary" onClick={() => { setSuggestionMode(false); setPriceScope("NO_MODIFICAR"); setEditing({ id: "", descripcion: "", precioBase: 0, activo: true }); }}><Plus size={19} />Nuevo trabajo</button> : null)} />
    <AviantoPanel className="work-suggestions-panel">
      <div className="panel-head"><div><h2>Trabajos frecuentes para sumar al catálogo</h2><p>Se sugieren cuando aparecen en al menos tres fichas distintas y todavía no figuran en Trabajos.</p></div></div>
      {suggestionError ? <EmptyState title="No se pudieron cargar las sugerencias" body={suggestionError} action={<button type="button" className="button secondary" onClick={() => setSuggestionReload((value) => value + 1)}>Reintentar</button>} /> : suggestions === null ? <LoadingState label="Buscando trabajos frecuentes…" /> : suggestions.length ? <ul className="work-suggestions-list">{suggestions.map((suggestion) => <li key={suggestion.descripcion}>
        <div><strong>{suggestion.descripcion}</strong><small>{suggestion.fichas} {suggestion.fichas === 1 ? "ficha" : "fichas"} · {suggestion.usos} {suggestion.usos === 1 ? "uso" : "usos"}</small></div>
        {can("trabajos.crear") && <button type="button" className="text-button" onClick={() => { setSuggestionMode(true); setPriceScope("NO_MODIFICAR"); setEditing({ id: "", descripcion: suggestion.descripcion, precioBase: 0, activo: true }); }}><Plus size={17} aria-hidden="true" />Agregar a Trabajos</button>}
      </li>)}</ul> : <p className="summary-empty work-suggestions-empty">Todavía no hay sugerencias. La lista se arma con trabajos repetidos en tres o más fichas.</p>}
    </AviantoPanel>
    <AviantoPanel className="record-list-panel work-catalog-record-list-panel">
      <div className="panel-head"><div><h2>Precios de referencia</h2><p>Valores sugeridos para presupuestos de taller.</p></div></div>
       <FilterBar primary={<SearchBox value={query} onChange={setQuery} placeholder="Buscar por descripción" />} activeCount={filter !== "Todos" ? 1 : 0}>
          <SelectField value={filter} onChange={setFilter} options={[{ value: "Activo", label: "Activo" }, { value: "Inactivo", label: "Inactivo" }]} placeholder="Todos" icon={Filter} ariaLabel="Filtrar trabajos por estado" />
       </FilterBar>
      {loadError ? <EmptyState title="No se pudieron cargar los trabajos" body={loadError} action={<button className="button secondary" onClick={() => load()}>Reintentar</button>} /> : !loaded ? <LoadingState label="Cargando trabajos..." /> : rows.length ? <AviantoRecordList label="Trabajos" records={rows.map((row) => ({
        id: row.id, title: row.descripcion, fields: [
          { label: "Precio sugerido", value: money(row.precioBase) },
          { label: "Estado", value: <span className={`record-state ${row.activo ? "active" : "inactive"}`}>{row.activo ? "Activo" : "Inactivo"}</span> },
        ], actions: <><button type="button" className="text-button" onClick={() => setDetail(row)} aria-label={`Ver trabajo ${row.descripcion}`}><Eye size={17} />Ver detalle</button>{can("trabajos.editar") && <button type="button" className="text-button secondary" onClick={() => { setSuggestionMode(false); setPriceScope("NO_MODIFICAR"); setEditing(row); }} aria-label={`Editar trabajo ${row.descripcion}`}><Edit3 size={17} />Editar</button>}{can("trabajos.eliminar") && <button type="button" className="text-button danger-action" onClick={() => setDeleting(row)} aria-label={`Eliminar trabajo ${row.descripcion}`}><Trash2 size={17} />Eliminar</button>}</>,
      }))} /> : <EmptyState title="No hay trabajos para mostrar" body="Creá un trabajo o ajustá los filtros." action={(can("trabajos.crear") ? <button className="button primary" onClick={() => setEditing({ id: "", descripcion: "", precioBase: 0, activo: true })}>Nuevo trabajo</button> : null)} />}
    </AviantoPanel>
    <AbmFormModal key={editing?.id || editing?.descripcion || "new"} open={editing !== null} resource="trabajo" mode={editing?.id ? "modificar" : "agregar"} initialValues={editing ?? {}} fields={[{ key: "descripcion", label: "Descripción", required: true, wide: true }, { key: "precioBase", label: "Precio sugerido", type: "currency", required: true }]} extra={editing?.id ? <fieldset className="work-price-scopes"><legend>Al cambiar el precio</legend>
       <label className="work-price-scope"><input type="radio" name="work-price-scope" value="NO_MODIFICAR" checked={priceScope === "NO_MODIFICAR"} onChange={() => setPriceScope("NO_MODIFICAR")} /><span><strong>No modificar fichas</strong><small>El precio nuevo se usa solo en presupuestos futuros.</small></span></label>
       <label className="work-price-scope"><input type="radio" name="work-price-scope" value="FICHAS_VIGENTES" checked={priceScope === "FICHAS_VIGENTES"} onChange={() => setPriceScope("FICHAS_VIGENTES")} /><span><strong>Aplicar a fichas vigentes</strong><small>Pendientes, en proceso, en revisión y terminadas. Las entregadas y canceladas no cambian.</small></span></label>
       <p className="work-price-scope-note">La opción elegida se aplica solo al guardar un precio distinto y busca el trabajo por su descripción. Se conservan los descuentos de cada trabajo.</p>
     </fieldset> : suggestionMode ? <p className="work-suggestion-form-note">El trabajo frecuente ya tiene una descripción. Definí un precio de referencia para incorporarlo al catálogo.</p> : undefined} extraDirty={priceScope !== "NO_MODIFICAR"} onClose={() => { setEditing(null); setPriceScope("NO_MODIFICAR"); setSuggestionMode(false); }} onSubmit={submit} onError={(message) => notify(message, "error")} />
    <Dialog open={detail !== null} title="Detalle del trabajo" onClose={() => setDetail(null)}><dl className="record-detail"><div><dt>Descripción</dt><dd>{detail?.descripcion}</dd></div><div><dt>Precio sugerido</dt><dd>{detail ? money(detail.precioBase) : "—"}</dd></div><div><dt>Estado</dt><dd>{detail?.activo ? "Activo" : "Inactivo"}</dd></div></dl><div className="modal-actions"><button className="button secondary" onClick={() => setDetail(null)}>Cerrar</button><button className="button primary" onClick={() => { setSuggestionMode(false); setPriceScope("NO_MODIFICAR"); setEditing(detail); setDetail(null); }}>Editar</button></div></Dialog>
     <ConfirmModal open={deleting !== null} title="Eliminar trabajo" body={`Vas a dar de baja "${deleting?.descripcion ?? ""}". No se sugerirá en nuevas fichas, pero los trabajos históricos se conservarán.`} confirmLabel="Eliminar trabajo" onClose={() => setDeleting(null)} onConfirm={async () => { const selected = deleting; if (!selected) return; setDeleting(null); try { await api(`/configuracion/trabajos/${selected.id}`, { method: "DELETE" }); load(); notify("Trabajo eliminado correctamente."); } catch (reason) { notify(errorMessage(reason), "error"); } }} />
  </AviantoPage>;
}

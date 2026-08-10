"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ArrowDownUp, ArrowRightLeft, Download, Eye, Filter, Plus, X } from "lucide-react";
import { api, download } from "../lib/api";
import { todayInAr } from "../lib/dates";
import type { AutocompleteResponse, ClienteResponse, MotovehiculoResponse, PageResponse, TransferRequest, TransferResponse } from "../lib/types";
import { AbmFormModal } from "./modal/abm-form-modal";
import { Dialog, EmptyState, Pagination, SearchBox } from "./ui";

const date = (value?: string | null) => {
  if (!value) return "—";
  const source = value.includes("T") ? value : `${value}T12:00:00`;
  return new Intl.DateTimeFormat("es-AR").format(new Date(source));
};
const errorMessage = (reason: unknown) => reason instanceof Error ? reason.message : "No fue posible completar la operación.";
const clientFields = [
  { key: "nombre", label: "Nombre y apellido / razón social", required: true, wide: true },
  { key: "telefono", label: "Teléfono", type: "tel" as const, required: true },
  { key: "documento", label: "DNI o CUIT" },
  { key: "email", label: "Email", type: "email" as const },
  { key: "direccion", label: "Dirección", wide: true },
  { key: "observaciones", label: "Observaciones", type: "textarea" as const, wide: true },
];

function AutocompleteList({ items, onChoose }: { items: AutocompleteResponse[]; onChoose: (item: AutocompleteResponse) => void }) {
  if (!items.length) return <p className="suggestions-empty">Sin coincidencias.</p>;
  return <div className="suggestions" role="listbox">
    {items.map((item) => <button type="button" key={item.id} role="option" aria-selected="false" onClick={() => onChoose(item)}><span>{item.label}</span><small>{item.secondary || ""}</small></button>)}
  </div>;
}

function TransferDialog({ open, onClose, onSaved, notify }: { open: boolean; onClose: () => void; onSaved: () => void; notify: (message: string) => void }) {
  const [motoQuery, setMotoQuery] = useState("");
  const [motoSuggestions, setMotoSuggestions] = useState<AutocompleteResponse[]>([]);
  const [selectedMoto, setSelectedMoto] = useState<MotovehiculoResponse | null>(null);
  const [clientQuery, setClientQuery] = useState("");
  const [clientSuggestions, setClientSuggestions] = useState<AutocompleteResponse[]>([]);
  const [selectedClient, setSelectedClient] = useState<AutocompleteResponse | null>(null);
  const [fechaTransferencia, setFechaTransferencia] = useState(todayInAr());
  const [observaciones, setObservaciones] = useState("");
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || motoQuery.trim().length < 2 || selectedMoto) return;
    let active = true;
    void api<AutocompleteResponse[]>("/motovehiculos/autocomplete", {}, { q: motoQuery.trim() })
      .then((items) => { if (active) setMotoSuggestions(items); })
      .catch(() => { if (active) setMotoSuggestions([]); });
    return () => { active = false; };
  }, [open, motoQuery, selectedMoto]);

  useEffect(() => {
    if (!open || clientQuery.trim().length < 2 || selectedClient) return;
    let active = true;
    void api<AutocompleteResponse[]>("/clientes/autocomplete", {}, { q: clientQuery.trim() })
      .then((items) => { if (active) setClientSuggestions(items); })
      .catch(() => { if (active) setClientSuggestions([]); });
    return () => { active = false; };
  }, [open, clientQuery, selectedClient]);

  const reset = () => {
    setMotoQuery("");
    setMotoSuggestions([]);
    setSelectedMoto(null);
    setClientQuery("");
    setClientSuggestions([]);
    setSelectedClient(null);
    setFechaTransferencia(todayInAr());
    setObservaciones("");
    setBusy(false);
    setError(null);
  };
  const close = () => { if (!busy) { reset(); onClose(); } };
  const chooseMoto = async (item: AutocompleteResponse) => {
    setBusy(true);
    setError(null);
    try {
      const moto = await api<MotovehiculoResponse>(`/motovehiculos/${item.id}`);
      setSelectedMoto(moto);
      setMotoQuery(moto.patente);
      setMotoSuggestions([]);
    } catch (reason) { setError(errorMessage(reason)); } finally { setBusy(false); }
  };
  const chooseClient = (item: AutocompleteResponse) => {
    setSelectedClient(item);
    setClientQuery(item.label);
    setClientSuggestions([]);
  };
  const createClient = async (values: Record<string, string>) => {
    try {
      const client = await api<ClienteResponse>("/clientes", { method: "POST", body: JSON.stringify(values) });
      chooseClient({ id: client.id, label: client.nombre, secondary: client.documento ?? client.telefono });
      setNewClientOpen(false);
      setError(null);
    } catch (reason) {
      setError(errorMessage(reason));
    }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedMoto) return setError("Seleccioná la moto que querés transferir.");
    if (!selectedMoto.propietarioId || !selectedMoto.propietario) return setError("La moto no tiene un propietario actual.");
    if (!selectedClient) return setError("Seleccioná el nuevo cliente.");
    if (selectedClient.id === selectedMoto.propietarioId) return setError("El nuevo cliente debe ser diferente al actual.");
    setBusy(true);
    setError(null);
    const payload: TransferRequest = { motoId: selectedMoto.id, clienteNuevoId: selectedClient.id, fechaTransferencia, observaciones: observaciones || undefined };
    try {
      await api<TransferResponse>("/transferencias", { method: "POST", body: JSON.stringify(payload) });
      reset();
      onClose();
      notify("Transferencia registrada.");
      onSaved();
    } catch (reason) { setError(errorMessage(reason)); } finally { setBusy(false); }
  };

  return <Dialog open={open} title="Nueva transferencia" onClose={close} wide className="transfer-modal">
    <form className="transfer-form" onSubmit={(event) => void submit(event)}>
      {error && <p className="login-pending" role="alert">{error}</p>}
      <section className="transfer-step">
        <div className="transfer-step-number">1</div>
        <div className="transfer-step-content">
          <h3>Elegí la moto</h3>
          <p>Buscá por patente, marca o modelo.</p>
          <div className="autocomplete-field">
            <input value={motoQuery} autoComplete="off" placeholder="Ej.: AA 123 AA" disabled={Boolean(selectedMoto) || busy} onChange={(event) => { setMotoQuery(event.target.value); setSelectedMoto(null); }} />
            {!selectedMoto && motoQuery.trim().length >= 2 && <AutocompleteList items={motoSuggestions} onChoose={(item) => void chooseMoto(item)} />}
          </div>
          {selectedMoto && <div className="transfer-vehicle">
            <div><strong>{selectedMoto.patente}</strong><span>{selectedMoto.marca} {selectedMoto.modelo}</span></div>
            <div><small>Cliente actual</small><strong>{selectedMoto.propietario ?? "Sin propietario"}</strong></div>
            <button type="button" className="icon-button" aria-label="Cambiar moto" onClick={() => { setSelectedMoto(null); setMotoQuery(""); setSelectedClient(null); setClientQuery(""); setClientSuggestions([]); }}><X size={17} /></button>
          </div>}
        </div>
      </section>
      <section className="transfer-step">
        <div className="transfer-step-number">2</div>
        <div className="transfer-step-content">
          <div className="transfer-client-head"><div><h3>Asigná el nuevo cliente</h3><p>El historial de fichas anteriores no se modifica.</p></div><button type="button" className="button secondary transfer-add-client" disabled={busy} onClick={() => setNewClientOpen(true)}>+ Agregar Cliente</button></div>
          <div className="autocomplete-field">
            <input value={clientQuery} autoComplete="off" placeholder="Buscar por nombre o documento" disabled={!selectedMoto || Boolean(selectedClient) || busy} onChange={(event) => { setClientQuery(event.target.value); setSelectedClient(null); }} />
            {selectedMoto && !selectedClient && clientQuery.trim().length >= 2 && <AutocompleteList items={clientSuggestions} onChoose={chooseClient} />}
          </div>
          {selectedClient && <div className="transfer-selection"><span>Nuevo cliente</span><strong>{selectedClient.label}</strong><button type="button" className="icon-button" aria-label="Cambiar cliente" onClick={() => { setSelectedClient(null); setClientQuery(""); }}><X size={17} /></button></div>}
        </div>
      </section>
      <section className="transfer-step">
        <div className="transfer-step-number">3</div>
        <div className="transfer-step-content">
          <h3>Definí la vigencia</h3>
          <p>Usá la fecha real del cambio de titularidad.</p>
          <div className="two-col transfer-fields">
            <label>Fecha de transferencia<input type="date" value={fechaTransferencia} max={todayInAr()} onChange={(event) => setFechaTransferencia(event.target.value)} required /></label>
            <label>Observaciones <span className="field-optional">Opcional</span><textarea value={observaciones} onChange={(event) => setObservaciones(event.target.value)} placeholder="Ej.: venta del vehículo" /></label>
          </div>
        </div>
      </section>
      <section className="transfer-summary" aria-live="polite">
        <div><span>Resumen</span><strong>{selectedMoto?.patente ?? "Sin moto seleccionada"}</strong></div>
        <div className="transfer-summary-flow"><strong>{selectedMoto?.propietario ?? "Cliente actual"}</strong><ArrowRightLeft size={18} aria-hidden="true" /><strong>{selectedClient?.label ?? "Nuevo cliente"}</strong></div>
        <small>La transferencia quedará registrada en el historial de la moto.</small>
      </section>
      <div className="modal-actions">
        <button type="button" className="button secondary" onClick={close} disabled={busy}>Cancelar</button>
        <button type="submit" className="button primary" disabled={busy || !selectedMoto || !selectedClient}><ArrowRightLeft size={17} />{busy ? "Registrando..." : "Confirmar transferencia"}</button>
      </div>
    </form>
    <AbmFormModal open={newClientOpen} resource="cliente" mode="agregar" fields={clientFields} onClose={() => setNewClientOpen(false)} onSubmit={createClient} />
  </Dialog>;
}

export function TransferenciasView({ canTransfer, onOpenMoto, notify }: { canTransfer: boolean; onOpenMoto: (id: string) => void; notify: (message: string) => void }) {
  const [query, setQuery] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [direction, setDirection] = useState<"ASC" | "DESC">("DESC");
  const [result, setResult] = useState<PageResponse<TransferResponse> | null>(null);
  const [page, setPage] = useState(1);
  const [flowOpen, setFlowOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const params = { q: query || undefined, fechaDesde: desde || undefined, fechaHasta: hasta || undefined, sortBy: "fechaTransferencia", direction };
  useEffect(() => {
    void api<PageResponse<TransferResponse>>("/transferencias", {}, { q: query || undefined, fechaDesde: desde || undefined, fechaHasta: hasta || undefined, sortBy: "fechaTransferencia", direction, page: page - 1, size: 20 })
      .then(setResult)
      .catch((reason) => setError(errorMessage(reason)));
  }, [query, desde, hasta, direction, page, reloadKey]);
  return <div className="page">
    <div className="page-heading">
      <div><h1>Transferencias</h1><p>Historial de cambios de titularidad de las motos.</p></div>
      {canTransfer && <button className="button primary" onClick={() => setFlowOpen(true)}><Plus size={19} />Nueva transferencia</button>}
    </div>
    {error && <p className="login-pending" role="alert">{error}</p>}
    <section className="panel table-panel">
      <div className="filter-bar">
        <SearchBox value={query} onChange={(value) => { setQuery(value); setPage(1); }} placeholder="Patente o cliente" />
        <label><Filter size={16} /><span className="date-label">Desde</span><input type="date" value={desde} onChange={(event) => { setDesde(event.target.value); setPage(1); }} /></label>
        <label><Filter size={16} /><span className="date-label">Hasta</span><input type="date" value={hasta} onChange={(event) => { setHasta(event.target.value); setPage(1); }} /></label>
        <button className="button secondary" onClick={() => { setDirection((value) => value === "DESC" ? "ASC" : "DESC"); setPage(1); }} aria-label="Cambiar orden de transferencias"><ArrowDownUp size={16} />{direction === "DESC" ? "Más recientes" : "Más antiguas"}</button>
        <button className="button secondary" onClick={() => void download("/transferencias/export.xlsx", "transferencias.xlsx", params).catch((reason) => setError(errorMessage(reason)))}><Download size={17} />Exportar Excel</button>
      </div>
      {result?.content.length ? <table><thead><tr><th>Patente</th><th>Fecha</th><th>Cliente anterior</th><th>Cliente nuevo</th><th>Observaciones</th><th /></tr></thead><tbody>{result.content.map((transfer) => <tr key={transfer.id}><td data-label="Patente"><strong>{transfer.patente}</strong><small>{transfer.moto}</small></td><td data-label="Fecha">{date(transfer.fechaTransferencia)}</td><td data-label="Cliente anterior">{transfer.clienteAnterior}</td><td data-label="Cliente nuevo">{transfer.clienteNuevo}</td><td data-label="Observaciones">{transfer.observaciones || "—"}</td><td className="table-actions"><button onClick={() => onOpenMoto(transfer.motoId)} aria-label={`Ver moto ${transfer.patente}`}><Eye size={17} /></button></td></tr>)}</tbody></table> : result ? <EmptyState title="No hay transferencias" body="Probá ajustar los filtros o registrá una nueva transferencia." action={canTransfer ? <button className="button primary" onClick={() => setFlowOpen(true)}><Plus size={17} />Nueva transferencia</button> : undefined} /> : <div className="table-loading" role="status">Cargando transferencias...</div>}
      <Pagination page={page} total={result?.totalPages || 1} onPage={setPage} />
    </section>
    <TransferDialog open={flowOpen} onClose={() => setFlowOpen(false)} onSaved={() => { setPage(1); setReloadKey((value) => value + 1); }} notify={notify} />
  </div>;
}

"use client";

import { useEffect, useState } from "react";
import { Eye, Plus, Settings2 } from "lucide-react";
import { api } from "../lib/api";
import { money } from "../lib/format";
import type {
  ClienteResponse,
  FichaResponse,
  MotovehiculoResponse,
  NextServiceResponse,
  OwnerResponse,
  PageResponse,
  RepuestoResponse,
  ServiceResponse,
} from "../lib/types";
import { Dialog, EmptyState, StatusBadge } from "./ui";

const date = (value?: string | null) => (value ? new Intl.DateTimeFormat("es-AR").format(new Date(value)) : "—");
const errorMessage = (reason: unknown) => reason instanceof Error ? reason.message : "No fue posible cargar la información.";

export function MotoDetail({
  id,
  onBack,
  onOpenFicha,
  onOpenRepuesto,
  onNewFicha,
  onNewRepuesto,
  notify,
}: {
  id: string;
  onBack: () => void;
  onOpenFicha: (ficha: FichaResponse) => void;
  onOpenRepuesto: (repuesto: RepuestoResponse) => void;
  onNewFicha: (prefill: { motoId: string; clienteId?: string | null }) => void;
  onNewRepuesto: (prefill: { motoId: string; clienteId?: string | null }) => void;
  notify: (message: string) => void;
}) {
  const [tab, setTab] = useState<"general" | "client" | "services" | "fichas" | "repuestos">("general");
  const [moto, setMoto] = useState<MotovehiculoResponse | null>(null);
  const [client, setClient] = useState<ClienteResponse | null>(null);
  const [owners, setOwners] = useState<OwnerResponse[]>([]);
  const [services, setServices] = useState<ServiceResponse[]>([]);
  const [nextService, setNextService] = useState<NextServiceResponse | null>(null);
  const [fichas, setFichas] = useState<FichaResponse[]>([]);
  const [repuestos, setRepuestos] = useState<RepuestoResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [serviceOpen, setServiceOpen] = useState(false);
  const [serviceKm, setServiceKm] = useState("");
  const [serviceDate, setServiceDate] = useState("");
  const [serviceNotes, setServiceNotes] = useState("");
  const [serviceSaving, setServiceSaving] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [configKm, setConfigKm] = useState("");
  const [configMonths, setConfigMonths] = useState("");
  const [configNotes, setConfigNotes] = useState("");
  const [configSaving, setConfigSaving] = useState(false);

  const load = () =>
    void api<MotovehiculoResponse>(`/motovehiculos/${id}`)
      .then((next) => { setMoto(next); if (next.propietarioId) void api<ClienteResponse>(`/clientes/${next.propietarioId}`).then(setClient).catch(() => setClient(null)); })
      .catch((reason) => setError(errorMessage(reason)));
  const loadServices = () => void api<ServiceResponse[]>(`/motovehiculos/${id}/services`).then(setServices).catch(() => undefined);
  const loadNext = () => void api<NextServiceResponse[]>("/services/proximos").then((list) => setNextService(list.find((next) => next.motoId === id) ?? null)).catch(() => undefined);
  useEffect(load, [id]);
  useEffect(() => {
    loadServices();
    loadNext();
    void api<OwnerResponse[]>(`/motovehiculos/${id}/propietarios`).then(setOwners).catch(() => undefined);
    void api<PageResponse<FichaResponse>>("/fichas", {}, { motoId: id, size: 50 }).then((result) => setFichas(result.content)).catch(() => undefined);
    void api<PageResponse<RepuestoResponse>>("/repuestos", {}, { motoId: id, size: 50 }).then((result) => setRepuestos(result.content)).catch(() => undefined);
  }, [id]);

  const addService = async () => {
    if (!serviceKm) return setError("Ingresá el kilometraje del service.");
    if (serviceSaving) return;
    setServiceSaving(true);
    try {
      await api<ServiceResponse>(`/motovehiculos/${id}/services`, {
        method: "POST",
        body: JSON.stringify({ kilometraje: Number(serviceKm), fecha: serviceDate || null, observaciones: serviceNotes || null }),
      });
      loadServices();
      void api<MotovehiculoResponse>(`/motovehiculos/${id}`).then(setMoto);
      loadNext();
      setServiceOpen(false);
      setServiceKm("");
      setServiceDate("");
      setServiceNotes("");
      notify("Service registrado.");
    } catch (reason) { setError(errorMessage(reason)); } finally { setServiceSaving(false); }
  };

  const saveConfig = async () => {
    if (configSaving) return;
    setConfigSaving(true);
    try {
      const next = await api<MotovehiculoResponse>(`/motovehiculos/${id}/config-service`, {
        method: "PATCH",
        body: JSON.stringify({
          kmServicePeriodo: configKm ? Number(configKm) : null,
          mesesServicePeriodo: configMonths ? Number(configMonths) : null,
          serviceObservaciones: configNotes || null,
        }),
      });
      setMoto(next);
      loadNext();
      setConfigOpen(false);
      notify("Configuración de service guardada.");
    } catch (reason) { setError(errorMessage(reason)); } finally { setConfigSaving(false); }
  };

  const openConfig = () => {
    setConfigKm(moto?.kmServicePeriodo != null ? String(moto.kmServicePeriodo) : "");
    setConfigMonths(moto?.mesesServicePeriodo != null ? String(moto.mesesServicePeriodo) : "");
    setConfigNotes(moto?.serviceObservaciones ?? "");
    setConfigOpen(true);
  };

  if (error) return <div className="page"><button className="back" onClick={onBack}>← Volver</button><p className="login-pending">{error}</p></div>;
  if (!moto) return <div className="page">Cargando…</div>;

  const tabs: { id: typeof tab; label: string }[] = [
    { id: "general", label: "Datos" },
    { id: "client", label: "Cliente" },
    { id: "services", label: "Service" },
    { id: "fichas", label: "Ficha" },
    { id: "repuestos", label: "Repuestos" },
  ];
  return (
    <div className="page">
      <button className="back" onClick={onBack}>← Volver a perfiles</button>
      <div className="detail-title">
        <div>
          <p>{moto.patente}</p>
          <h1>{moto.marca} {moto.modelo}</h1>
          <span>{moto.propietario ?? "Sin propietario"} · KM {moto.kilometraje ?? "—"}</span>
        </div>
        <div className="detail-stack">
          <StatusBadge status={moto.estado} />
          <strong>{moto.anio ?? "—"}</strong>
        </div>
      </div>
      <nav className="tabs">
        {tabs.map((item) => (
          <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}>{item.label}</button>
        ))}
      </nav>
      {tab === "general" && (
        <section className="panel form-stack">
          <div className="panel-head">
            <h2>Datos del vehículo</h2>
          </div>
          <dl className="record-detail">
            <div><dt>Marca / modelo</dt><dd>{moto.marca} {moto.modelo}</dd></div>
            <div><dt>Patente</dt><dd>{moto.patente}</dd></div>
            <div><dt>Año</dt><dd>{moto.anio ?? "—"}</dd></div>
            <div><dt>Kilometraje</dt><dd>{moto.kilometraje ?? "—"}</dd></div>
            <div><dt>Estado</dt><dd>{moto.estado}</dd></div>
            <div><dt>Observaciones</dt><dd>{moto.observaciones || "—"}</dd></div>
          </dl>
        </section>
      )}
      {tab === "client" && (
        <section className="panel form-stack">
          <div className="panel-head"><div><h2>Cliente</h2><p>Propietario actual de la moto.</p></div></div>
          <dl className="record-detail">
            <div><dt>Nombre y apellido</dt><dd>{moto.propietario ?? "—"}</dd></div>
            <div><dt>Teléfono</dt><dd>{client?.telefono ?? "—"}</dd></div>
          </dl>
          <section className="table-panel"><h3>Propietarios anteriores</h3>{owners.filter((owner) => !owner.actual).length ? <table><thead><tr><th>Cliente</th><th>Desde</th><th>Hasta</th><th>Observaciones</th></tr></thead><tbody>{owners.filter((owner) => !owner.actual).sort((a, b) => a.fechaDesde.localeCompare(b.fechaDesde)).map((owner) => <tr key={owner.id}><td data-label="Cliente">{owner.cliente}</td><td data-label="Desde">{date(owner.fechaDesde)}</td><td data-label="Hasta">{date(owner.fechaHasta)}</td><td data-label="Observaciones">{owner.observaciones || "—"}</td></tr>)}</tbody></table> : <p>Esta moto no tiene propietarios anteriores.</p>}</section>
        </section>
      )}
      {tab === "services" && (
        <section className="panel table-panel">
          <div className="panel-head">
            <h2>Services registrados</h2>
            <div className="panel-actions">
              <button className="button secondary" onClick={openConfig}><Settings2 size={17} />Configurar periodos</button>
              <button className="button secondary" disabled={serviceSaving} onClick={() => { setServiceKm(moto.kilometraje != null ? String(moto.kilometraje) : ""); setServiceOpen(true); }}><Plus size={17} />Registrar service</button>
            </div>
          </div>
          <div className="metrics service-kpis"><section className="metric"><span>Último service</span><strong>{moto.kmUltimoService != null ? `${moto.kmUltimoService.toLocaleString("es-AR")} km` : "—"}</strong><small>{date(moto.fechaUltimoService)}</small></section><section className="metric"><span>Período</span><strong>{moto.kmServicePeriodo ?? "—"} km</strong><small>{moto.mesesServicePeriodo ?? "—"} meses</small></section><section className="metric"><span>Próximo service</span><strong>{nextService?.proximKm != null ? `${nextService.proximKm.toLocaleString("es-AR")} km` : "—"}</strong><small>{nextService?.proximaFecha ? date(nextService.proximaFecha) : nextService?.sinReferencia ? "Sin referencia" : "—"}</small></section></div>
          {services.length ? (
            <table>
              <thead><tr><th>Fecha</th><th>Kilometraje</th><th>Ficha</th><th>Observaciones</th></tr></thead>
              <tbody>{services.map((service) => <tr key={service.id}><td data-label="Fecha">{date(service.fecha)}</td><td data-label="Kilometraje">{service.kilometraje}</td><td data-label="Ficha">{service.fichaNumero ?? "—"}</td><td data-label="Observaciones">{service.observaciones || "—"}</td></tr>)}</tbody>
            </table>
          ) : <EmptyState title="Sin services" body="Registrá el primer service de la moto." />}
        </section>
      )}
      {tab === "fichas" && (
        <section className="panel table-panel">
          <div className="panel-head"><div><h2>Ficha</h2><p>Trabajo actual e historial de ingresos al taller.</p></div><button className="button secondary" onClick={() => onNewFicha({ motoId: moto.id, clienteId: moto.propietarioId })}><Plus size={17} />Nueva ficha</button></div>
          {fichas.length ? (
            <table>
              <thead><tr><th>Ficha</th><th>Estado</th><th>Pago</th><th>Total</th><th /></tr></thead>
              <tbody>{fichas.map((ficha) => <tr key={ficha.id}><td data-label="Ficha">{ficha.numero}</td><td data-label="Estado"><StatusBadge status={ficha.estado} /></td><td data-label="Pago">{ficha.estadoPago}</td><td data-label="Total">{money(ficha.total)}</td><td className="table-actions"><button onClick={() => onOpenFicha(ficha)} aria-label={`Ver ficha ${ficha.numero}`}><Eye size={17} /></button></td></tr>)}</tbody>
            </table>
          ) : <EmptyState title="Sin fichas" body="Esta moto todavía no tiene ingresos de trabajo." />}
        </section>
      )}
      {tab === "repuestos" && (
        <section className="panel table-panel">
          <div className="panel-head"><h2>Pedidos de repuestos</h2><button className="button secondary" onClick={() => onNewRepuesto({ motoId: moto.id, clienteId: moto.propietarioId })}><Plus size={17} />Nuevo pedido</button></div>
          {repuestos.length ? (
            <table>
              <thead><tr><th>Pedido</th><th>Estado</th><th>Pago</th><th>Total</th><th /></tr></thead>
              <tbody>{repuestos.map((repuesto) => <tr key={repuesto.id}><td data-label="Pedido">{repuesto.numero}</td><td data-label="Estado"><StatusBadge status={repuesto.estado} /></td><td data-label="Pago">{repuesto.estadoPago}</td><td data-label="Total">{money(repuesto.total)}</td><td className="table-actions"><button onClick={() => onOpenRepuesto(repuesto)} aria-label={`Ver pedido ${repuesto.numero}`}><Eye size={17} /></button></td></tr>)}</tbody>
            </table>
          ) : <EmptyState title="Sin repuestos" body="Aún no hay pedidos de repuestos para esta moto." />}
        </section>
      )}
      <Dialog open={serviceOpen} title="Registrar service" onClose={() => setServiceOpen(false)}>
        <form className="record-form" onSubmit={(event) => { event.preventDefault(); void addService(); }}>
          <label>Kilometraje<input type="number" min="0" value={serviceKm} onChange={(event) => setServiceKm(event.target.value)} required /></label>
          <label>Fecha<input type="date" value={serviceDate} onChange={(event) => setServiceDate(event.target.value)} /></label>
          <label>Observación<input type="text" value={serviceNotes} onChange={(event) => setServiceNotes(event.target.value)} placeholder="Ej: cambio de aceite y filtros" /></label>
          <div className="modal-actions"><button type="button" className="button secondary" onClick={() => setServiceOpen(false)}>Cancelar</button><button className="button primary" disabled={serviceSaving}>{serviceSaving ? "Guardando..." : "Guardar"}</button></div>
        </form>
      </Dialog>
      <Dialog open={configOpen} title="Configurar service" onClose={() => setConfigOpen(false)}>
        <form className="record-form" onSubmit={(event) => { event.preventDefault(); void saveConfig(); }}>
          <label>Periodo en km<input type="number" min="0" value={configKm} onChange={(event) => setConfigKm(event.target.value)} placeholder="Ej: 5000" /></label>
          <label>Periodo en meses<input type="number" min="0" value={configMonths} onChange={(event) => setConfigMonths(event.target.value)} placeholder="Ej: 6" /></label>
          <label>Observaciones<input type="text" value={configNotes} onChange={(event) => setConfigNotes(event.target.value)} /></label>
          <div className="modal-actions"><button type="button" className="button secondary" onClick={() => setConfigOpen(false)}>Cancelar</button><button className="button primary" disabled={configSaving}>{configSaving ? "Guardando..." : "Guardar"}</button></div>
        </form>
      </Dialog>
    </div>
  );
}

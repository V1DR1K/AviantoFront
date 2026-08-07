"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
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
  notify,
}: {
  id: string;
  onBack: () => void;
  onOpenFicha: (ficha: FichaResponse) => void;
  onOpenRepuesto: (repuesto: RepuestoResponse) => void;
  notify: (message: string) => void;
}) {
  const [tab, setTab] = useState<"general" | "owners" | "services" | "fichas" | "repuestos">("general");
  const [moto, setMoto] = useState<MotovehiculoResponse | null>(null);
  const [owners, setOwners] = useState<OwnerResponse[]>([]);
  const [services, setServices] = useState<ServiceResponse[]>([]);
  const [nextService, setNextService] = useState<NextServiceResponse | null>(null);
  const [fichas, setFichas] = useState<FichaResponse[]>([]);
  const [repuestos, setRepuestos] = useState<RepuestoResponse[]>([]);
  const [clients, setClients] = useState<ClienteResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ownerOpen, setOwnerOpen] = useState(false);
  const [serviceOpen, setServiceOpen] = useState(false);
  const [ownerClientId, setOwnerClientId] = useState("");
  const [ownerDate, setOwnerDate] = useState("");
  const [serviceKm, setServiceKm] = useState("");
  const [serviceDate, setServiceDate] = useState("");

  const load = () =>
    void api<MotovehiculoResponse>(`/motovehiculos/${id}`)
      .then((next) => { setMoto(next); })
      .catch((reason) => setError(errorMessage(reason)));
  useEffect(load, [id]);
  useEffect(() => {
    void api<OwnerResponse[]>(`/motovehiculos/${id}/propietarios`).then(setOwners).catch((reason) => setError(errorMessage(reason)));
    void api<ServiceResponse[]>(`/motovehiculos/${id}/services`).then(setServices).catch((reason) => setError(errorMessage(reason)));
    void api<NextServiceResponse[]>("/services/proximos").then((list) => setNextService(list.find((next) => next.motoId === id) ?? null)).catch(() => undefined);
    void api<PageResponse<FichaResponse>>("/fichas", {}, { motoId: id, size: 50 }).then((result) => setFichas(result.content)).catch(() => undefined);
    void api<PageResponse<RepuestoResponse>>("/repuestos", {}, { motoId: id, size: 50 }).then((result) => setRepuestos(result.content)).catch(() => undefined);
    void api<PageResponse<ClienteResponse>>("/clientes", {}, { size: 100, activo: true }).then((r) => setClients(r.content)).catch(() => undefined);
  }, [id]);

  const addOwner = async () => {
    if (!ownerClientId) return setError("Seleccioná un cliente.");
    try {
      const owner = await api<OwnerResponse>(`/motovehiculos/${id}/propietarios`, {
        method: "POST",
        body: JSON.stringify({ clienteId: ownerClientId, fechaDesde: ownerDate || null, observaciones: null }),
      });
      void api<OwnerResponse[]>(`/motovehiculos/${id}/propietarios`).then(setOwners);
      setOwnerOpen(false);
      setOwnerClientId("");
      setOwnerDate("");
      notify(`Propietario agregado (${owner.cliente}).`);
    } catch (reason) { setError(errorMessage(reason)); }
  };
  const addService = async () => {
    if (!serviceKm) return setError("Ingresá el kilometraje del service.");
    try {
      await api<ServiceResponse>(`/motovehiculos/${id}/services`, {
        method: "POST",
        body: JSON.stringify({ kilometraje: Number(serviceKm), fecha: serviceDate || null, observaciones: null }),
      });
      void api<ServiceResponse[]>(`/motovehiculos/${id}/services`).then(setServices);
      void api<MotovehiculoResponse>(`/motovehiculos/${id}`).then(setMoto);
      void api<NextServiceResponse[]>("/services/proximos").then((list) => setNextService(list.find((next) => next.motoId === id) ?? null));
      setServiceOpen(false);
      setServiceKm("");
      setServiceDate("");
      notify("Service registrado.");
    } catch (reason) { setError(errorMessage(reason)); }
  };

  if (error) return <div className="page"><button className="back" onClick={onBack}>← Volver</button><p className="login-pending">{error}</p></div>;
  if (!moto) return <div className="page">Cargando…</div>;

  const tabs: { id: typeof tab; label: string }[] = [
    { id: "general", label: "General" },
    { id: "owners", label: "Propietarios" },
    { id: "services", label: "Service" },
    { id: "fichas", label: "Fichas" },
    { id: "repuestos", label: "Repuestos" },
  ];
  return (
    <div className="page">
      <button className="back" onClick={onBack}>← Volver a motos</button>
      <div className="detail-title">
        <div>
          <p>{moto.patente}</p>
          <h1>{moto.marca} {moto.modelo}</h1>
          <span>{moto.cliente} · KM {moto.kilometraje ?? "—"}</span>
        </div>
        <div className="detail-stack">
          <StatusBadge status={moto.estado} />
          <strong>{moto.anio ?? "—"}</strong>
        </div>
      </div>
      {nextService && (
        <section className="panel next-service">
          <h3>Próximo service</h3>
          <p>
            {nextService.sinReferencia
              ? "Sin configuración de service (periodos)."
              : nextService.atrasadoKm || nextService.atrasadoFecha
                ? <span className="text-danger">Atrasado — definí o ejecutá un service.</span>
                : `KM sugerido ${nextService.proximKm ?? "—"} · Fecha ${nextService.proximaFecha ? date(nextService.proximaFecha) : "—"}`}
          </p>
        </section>
      )}
      <nav className="tabs">
        {tabs.map((item) => (
          <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}>{item.label}</button>
        ))}
      </nav>
      {tab === "general" && (
        <section className="panel form-stack">
          <div className="panel-head"><h2>Datos del vehículo</h2></div>
          <dl className="record-detail">
            <div><dt>Cliente</dt><dd>{moto.cliente}</dd></div>
            <div><dt>Marca / modelo</dt><dd>{moto.marca} {moto.modelo}</dd></div>
            <div><dt>Patente</dt><dd>{moto.patente}</dd></div>
            <div><dt>Año</dt><dd>{moto.anio ?? "—"}</dd></div>
            <div><dt>Kilometraje</dt><dd>{moto.kilometraje ?? "—"}</dd></div>
            <div><dt>Estado</dt><dd>{moto.estado}</dd></div>
            <div><dt>Último service KM</dt><dd>{moto.kmUltimoService ?? "—"}</dd></div>
            <div><dt>Último service fecha</dt><dd>{date(moto.fechaUltimoService)}</dd></div>
            <div><dt>Periodo KM</dt><dd>{moto.kmServicePeriodo ?? "—"} km</dd></div>
            <div><dt>Periodo meses</dt><dd>{moto.mesesServicePeriodo ?? "—"} meses</dd></div>
            <div><dt>Observaciones</dt><dd>{moto.observaciones || "—"}</dd></div>
          </dl>
        </section>
      )}
      {tab === "owners" && (
        <section className="panel table-panel">
          <div className="panel-head">
            <h2>Historial de propietarios</h2>
            <button className="button primary" onClick={() => { setOwnerDate(new Date().toISOString().slice(0, 10)); setOwnerOpen(true); }}><Plus size={17} />Agregar propietario</button>
          </div>
          {owners.length ? (
            <table>
              <thead><tr><th>Cliente</th><th>Desde</th><th>Hasta</th><th>Actual</th></tr></thead>
              <tbody>{owners.map((owner) => <tr key={owner.id}><td>{owner.cliente}</td><td>{date(owner.fechaDesde)}</td><td>{date(owner.fechaHasta)}</td><td>{owner.actual ? "Sí" : "—"}</td></tr>)}</tbody>
            </table>
          ) : <EmptyState title="Sin propietarios" body="Agregá el historial de dueños de la moto." />}
        </section>
      )}
      {tab === "services" && (
        <section className="panel table-panel">
          <div className="panel-head">
            <h2>Services registrados</h2>
            <button className="button secondary" onClick={() => setServiceOpen(true)}><Plus size={17} />Registrar service</button>
          </div>
          {services.length ? (
            <table>
              <thead><tr><th>Fecha</th><th>Kilometraje</th><th>Observaciones</th></tr></thead>
              <tbody>{services.map((service) => <tr key={service.id}><td>{date(service.fecha)}</td><td>{service.kilometraje}</td><td>{service.observaciones || "—"}</td></tr>)}</tbody>
            </table>
          ) : <EmptyState title="Sin services" body="Registrá el primer service de la moto." />}
        </section>
      )}
      {tab === "fichas" && (
        <section className="panel table-panel">
          <div className="panel-head"><h2>Fichas de trabajo</h2></div>
          {fichas.length ? (
            <table>
              <thead><tr><th>Ficha</th><th>Estado</th><th>Pago</th><th>Total</th><th /></tr></thead>
              <tbody>{fichas.map((ficha) => <tr key={ficha.id}><td>{ficha.numero}</td><td><StatusBadge status={ficha.estado} /></td><td>{ficha.estadoPago}</td><td>{money(ficha.total)}</td><td><button className="row-action" onClick={() => onOpenFicha(ficha)}>Ver</button></td></tr>)}</tbody>
            </table>
          ) : <EmptyState title="Sin fichas" body="Esta moto todavía no tiene fichas de trabajo." />}
        </section>
      )}
      {tab === "repuestos" && (
        <section className="panel table-panel">
          <div className="panel-head"><h2>Pedidos de repuestos</h2></div>
          {repuestos.length ? (
            <table>
              <thead><tr><th>Pedido</th><th>Estado</th><th>Pago</th><th>Total</th><th /></tr></thead>
              <tbody>{repuestos.map((repuesto) => <tr key={repuesto.id}><td>{repuesto.numero}</td><td><StatusBadge status={repuesto.estado} /></td><td>{repuesto.estadoPago}</td><td>{money(repuesto.total)}</td><td><button className="row-action" onClick={() => onOpenRepuesto(repuesto)}>Ver</button></td></tr>)}</tbody>
            </table>
          ) : <EmptyState title="Sin repuestos" body="Aún no hay pedidos de repuestos para esta moto." />}
        </section>
      )}
      <Dialog open={ownerOpen} title="Agregar propietario" onClose={() => setOwnerOpen(false)}>
        <form className="record-form" onSubmit={(event) => { event.preventDefault(); void addOwner(); }}>
          <label>Cliente<select value={ownerClientId} onChange={(event) => setOwnerClientId(event.target.value)} required><option value="">Seleccionar</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.nombre}</option>)}</select></label>
          <label>Fecha desde<input type="date" value={ownerDate} onChange={(event) => setOwnerDate(event.target.value)} /></label>
          <div className="modal-actions"><button type="button" className="button secondary" onClick={() => setOwnerOpen(false)}>Cancelar</button><button className="button primary">Guardar</button></div>
        </form>
      </Dialog>
      <Dialog open={serviceOpen} title="Registrar service" onClose={() => setServiceOpen(false)}>
        <form className="record-form" onSubmit={(event) => { event.preventDefault(); void addService(); }}>
          <label>Kilometraje<input type="number" min="0" value={serviceKm} onChange={(event) => setServiceKm(event.target.value)} required /></label>
          <label>Fecha<input type="date" value={serviceDate} onChange={(event) => setServiceDate(event.target.value)} /></label>
          <div className="modal-actions"><button type="button" className="button secondary" onClick={() => setServiceOpen(false)}>Cancelar</button><button className="button primary">Guardar</button></div>
        </form>
      </Dialog>
    </div>
  );
}